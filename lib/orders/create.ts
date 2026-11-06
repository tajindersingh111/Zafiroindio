import { after } from "next/server";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db/prisma";
import { getDoc, nextSequence, decrementProductStock } from "@/lib/db/store";
import { createAuditLog } from "@/lib/db/audit";
import { generateInvoiceForOrder } from "@/lib/db/invoices";
import { sendTransactionalEmail } from "@/lib/email/service";
import { onOrderConfirmed } from "@/lib/shipping/provider";
import { sendOrderConfirmationWhatsApp } from "@/lib/notifications/whatsapp";
import { redeemCoupon } from "@/lib/checkout/coupon";
import type { PricedLine } from "@/lib/pricing";
import type { Address, Customer, Order, OrderItem, OrderNote, OrderStatus, PaymentMethod, PaymentStatus, Product } from "@/lib/db/types";
import type { CheckoutSnapshot } from "@/lib/checkout/session";

/**
 * Order creation for our own checkout (Razorpay / COD).
 *
 * The same discipline as the Shiprocket path in lib/orders/service.ts: one transaction covers the
 * idempotency marker, the stock decrement, the customer record and the order row, so a retried
 * webhook can never create two orders or deduct stock twice, and a crash can never leave half an
 * order behind.
 */

/** One row per payment reference: the unique key that stops two confirmations racing. */
const PAYMENT_INDEX = "orders-by-payment";

function isUniqueViolation(err: unknown): boolean {
  return err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002";
}

/** Turns priced cart lines into stored order items, snapshotting the cost price for profitability. */
export function buildOrderItems(lines: PricedLine[], productsById: Map<string, Product>): OrderItem[] {
  return lines.map((line) => {
    const product = productsById.get(line.productId);
    const variation = line.variationId ? product?.variations?.find((v) => v.id === line.variationId) : undefined;
    return {
      productId: line.productId,
      variationId: line.variationId,
      name: line.name,
      sku: line.sku,
      quantity: line.quantity,
      price: line.price,
      // CRITICAL: cost snapshot at the time of the order (profitability reports rely on it).
      // Variations carry no cost of their own, so the product's cost applies to every variation.
      costPrice: product?.costPrice,
      discount: 0,
      tax: 0,
      total: line.total,
      image: line.image,
      attributes: variation?.attributes,
    };
  });
}

/** Finds or creates the customer inside the order transaction, keeping their totals current. */
async function upsertCustomerDoc(
  tx: Prisma.TransactionClient,
  identity: { name: string; email: string; phone: string; customerId?: string },
  shipping: Address,
  billing: Address,
  orderTotal: number,
  orderId: string,
  now: string
): Promise<string> {
  const byId = identity.customerId
    ? await tx.document.findUnique({ where: { collection_id: { collection: "customers", id: identity.customerId } } })
    : null;
  const byPhone = !byId && identity.phone
    ? await tx.document.findFirst({ where: { collection: "customers", data: { path: ["phone"], equals: identity.phone } } })
    : null;
  const byEmail = !byId && !byPhone && identity.email
    ? await tx.document.findFirst({ where: { collection: "customers", data: { path: ["email"], equals: identity.email } } })
    : null;
  const row = byId ?? byPhone ?? byEmail;
  const [firstName, ...rest] = identity.name.split(" ");

  if (row) {
    const c = row.data as unknown as Customer;
    const updated: Customer = {
      ...c,
      // Fill in details we learned at checkout without overwriting what the shopper already set.
      firstName: c.firstName && c.firstName !== "Customer" ? c.firstName : firstName || "Customer",
      lastName: c.lastName || rest.join(" "),
      email: c.email || identity.email,
      shipping: shipping ?? c.shipping,
      billing: billing ?? c.billing,
      totalOrders: (c.totalOrders || 0) + 1,
      totalSpent: (c.totalSpent || 0) + orderTotal,
      lastOrderId: orderId,
      lastOrderDate: now,
      updatedAt: now,
    };
    await tx.document.update({
      where: { collection_id: { collection: "customers", id: c.id } },
      data: { data: updated as unknown as Prisma.InputJsonValue },
    });
    return c.id;
  }

  const id = `cust-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
  const customer: Customer = {
    id,
    type: "retail",
    status: "active",
    firstName: firstName || "Customer",
    lastName: rest.join(" "),
    email: identity.email,
    phone: identity.phone,
    billing,
    shipping,
    totalOrders: 1,
    totalSpent: orderTotal,
    lastOrderId: orderId,
    lastOrderDate: now,
    registeredAt: now,
    updatedAt: now,
  };
  await tx.document.create({
    data: { collection: "customers", id, position: -Math.floor(Date.now() / 1000), data: customer as unknown as Prisma.InputJsonValue },
  });
  return id;
}

export type CreateOrderResult =
  | { status: "created"; order: Order; onHold: boolean }
  | { status: "duplicate"; order: Order | null };

export interface CreateDirectOrderParams {
  /** Stable key for this payment (Razorpay order id, or `cod_<ref>`): the idempotency guarantee. */
  paymentKey: string;
  snapshot: CheckoutSnapshot;
  customer: { name: string; email: string; phone: string; customerId?: string };
  shipping: Address;
  billing: Address;
  paymentMethod: PaymentMethod;
  paymentStatus: PaymentStatus;
  transactionId?: string;
  razorpayOrderId?: string;
  razorpayPaymentId?: string;
}

/** Our order for a payment key, if one was stored already. */
export async function findOrderIdByPaymentKey(paymentKey: string): Promise<string | null> {
  const marker = await getDoc<{ id: string; orderId: string }>(PAYMENT_INDEX, paymentKey);
  return marker?.orderId ?? null;
}

/**
 * Stores an order exactly once for a given payment key.
 *
 * Called by the verify route and by the Razorpay webhook — whichever arrives first wins, and the
 * other gets `duplicate`.
 */
export async function createDirectOrder(params: CreateDirectOrderParams): Promise<CreateOrderResult> {
  const existingId = await findOrderIdByPaymentKey(params.paymentKey);
  if (existingId) return { status: "duplicate", order: await getDoc<Order>("orders", existingId) };

  const now = new Date().toISOString();
  const seq = await nextSequence("order", 10000);
  const orderId = `ord-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  const orderNumber = `ZI-${seq}`;
  const snapshot = params.snapshot;

  let result: CreateOrderResult;
  try {
    result = await prisma.$transaction(
      async (tx) => {
        // Primary key (collection, id): a concurrent confirmation of the same payment fails here.
        await tx.document.create({
          data: { collection: PAYMENT_INDEX, id: params.paymentKey, data: { id: params.paymentKey, orderId } },
        });

        const notes: OrderNote[] = [];
        let onHold = false;

        for (const item of snapshot.items) {
          if (!item.productId) continue;
          const stock = await decrementProductStock(item.productId, item.quantity, tx);
          if (!stock.ok) {
            onHold = true;
            notes.unshift({
              id: `nte-${Date.now()}-${notes.length}`,
              note: `Insufficient stock for ${item.name} (wanted ${item.quantity}, available ${stock.stock ?? 0}). Order placed ON HOLD — restock or refund.`,
              isCustomerNote: false,
              createdAt: now,
            });
          }
        }

        const customerId = await upsertCustomerDoc(tx, params.customer, params.shipping, params.billing, snapshot.total, orderId, now);

        const isCod = params.paymentMethod === "cod";
        const status: OrderStatus = onHold ? "on_hold" : isCod ? "processing" : "paid";

        const order: Order = {
          id: orderId,
          orderNumber,
          ...(params.razorpayOrderId ? { razorpayOrderId: params.razorpayOrderId } : {}),
          ...(params.razorpayPaymentId ? { razorpayPaymentId: params.razorpayPaymentId } : {}),
          customerId,
          customerName: params.customer.name,
          customerEmail: params.customer.email,
          customerPhone: params.customer.phone,
          type: "retail",
          status,
          items: snapshot.items,
          billing: params.billing,
          shipping: params.shipping,
          couponCode: snapshot.couponCode,
          couponDiscount: snapshot.discount,
          subtotal: snapshot.subtotal,
          // The COD handling fee is part of what the courier collects, so it belongs with shipping.
          shippingCost: snapshot.shippingCost + snapshot.codFee,
          tax: snapshot.tax,
          discount: snapshot.discount,
          total: snapshot.total,
          paymentMethod: params.paymentMethod,
          paymentStatus: params.paymentStatus,
          transactionId: params.transactionId,
          notes,
          createdAt: now,
          updatedAt: now,
        };

        await tx.document.create({
          data: {
            collection: "orders",
            id: orderId,
            position: -Math.floor(Date.now() / 1000),
            data: order as unknown as Prisma.InputJsonValue,
          },
        });

        return { status: "created" as const, order, onHold };
      },
      { timeout: 30_000, maxWait: 10_000 }
    );
  } catch (err) {
    if (isUniqueViolation(err)) {
      const id = await findOrderIdByPaymentKey(params.paymentKey);
      return { status: "duplicate", order: id ? await getDoc<Order>("orders", id) : null };
    }
    throw err;
  }

  if (result.status === "created") await runPostOrderTasks(result.order, snapshot, result.onHold);
  return result;
}

/**
 * Schedules background work after the response.
 *
 * `after()` throws when there is no request scope (a script, a test, or a call from somewhere other
 * than a route handler). The order is already committed by the time we get here, so that throw
 * would turn a successful payment into a 500 and invite the client to retry. Fall back to running
 * the task detached instead.
 */
function afterResponse(task: () => Promise<void>): void {
  try {
    after(() => task().catch((e) => console.error("Post-order task failed:", e)));
  } catch {
    void task().catch((e) => console.error("Post-order task failed:", e));
  }
}

/**
 * Everything that happens after an order is safely stored. All best-effort: an e-mail bounce or a
 * ShipMozo outage must never fail (and so re-trigger) the payment confirmation — so this never
 * throws, whatever goes wrong inside it.
 */
async function runPostOrderTasks(order: Order, snapshot: CheckoutSnapshot, onHold: boolean): Promise<void> {
  try {
    await postOrderTasks(order, snapshot, onHold);
  } catch (e) {
    console.error(`Post-order follow-ups failed for ${order.orderNumber} (the order itself is stored):`, e);
  }
}

async function postOrderTasks(order: Order, snapshot: CheckoutSnapshot, onHold: boolean): Promise<void> {
  if (snapshot.couponId) await redeemCoupon(snapshot.couponId).catch((e) => console.error("Coupon redemption failed:", e));

  await createAuditLog({
    userId: "storefront",
    userName: "Online checkout",
    userRole: "system",
    action: order.paymentMethod === "cod" ? "ORDER_CREATED_COD" : "ORDER_CREATED_RAZORPAY",
    module: "orders",
    recordId: order.id,
    recordName: order.orderNumber,
    updatedData: { total: order.total, status: order.status, paymentMethod: order.paymentMethod },
    riskLevel: onHold ? "HIGH" : "LOW",
  }).catch((e) => console.error("Audit log failed:", e));

  await generateInvoiceForOrder(order).catch((e) => console.error("Invoice generation failed:", e));
  await sendTransactionalEmail(order.paymentStatus === "paid" ? "PAYMENT_SUCCESS" : "ORDER_CREATED", order).catch((e) =>
    console.error("Order email failed:", e)
  );

  // Hand to ShipMozo and WhatsApp the customer after the response, so the shopper never waits on it.
  afterResponse(() => onOrderConfirmed(order));
  afterResponse(() => sendOrderConfirmationWhatsApp(order));
}
