import { prisma } from "@/lib/db/prisma";
import { Prisma } from "@prisma/client";
import { getDoc, upsertDoc, nextSequence, decrementProductStock, restoreProductStock, updateDoc, findOneByField } from "@/lib/db/store";
import { resolveVariantId } from "@/lib/shiprocket/variants";
import type { Address, Customer, Order, OrderItem, OrderStatus, PaymentMethod, PaymentStatus, Product, RefundRecord, ShipmentRecord } from "@/lib/db/types";
import { normalizeEmail, normalizePhone } from "@/lib/orders/contact";

// ───────────────────────── Fastrr / Shiprocket Checkout payload normalisation ─────────────────────────

export interface NormalizedCheckoutOrder {
  /** Shiprocket's own order id (also returned when we requested the checkout token). */
  externalOrderId: string;
  eventType: string;
  outcome: "success" | "failed" | "pending";
  isCod: boolean;
  paymentStatus: PaymentStatus;
  transactionId?: string;
  customer: { name: string; email: string; phone: string };
  shipping: Address;
  billing: Address;
  lines: { variantId?: string; productRef?: string; sku?: string; name?: string; quantity: number; unitPrice?: number }[];
  total: number;
  discount: number;
  shippingCost: number;
  couponCode?: string;
}

type Raw = Record<string, any>;

const pick = (obj: Raw | undefined, ...keys: string[]): any => {
  if (!obj) return undefined;
  for (const k of keys) if (obj[k] !== undefined && obj[k] !== null && obj[k] !== "") return obj[k];
  return undefined;
};

function toAddress(raw: Raw | undefined, fallbackName: string, phone: string, email: string): Address {
  const first = String(pick(raw, "firstName", "first_name") ?? fallbackName.split(" ")[0] ?? "Customer");
  const last = String(pick(raw, "lastName", "last_name") ?? fallbackName.split(" ").slice(1).join(" "));
  return {
    firstName: first,
    lastName: last,
    address1: String(pick(raw, "address1", "address_1", "address", "line1") ?? ""),
    address2: pick(raw, "address2", "address_2", "line2") ? String(pick(raw, "address2", "address_2", "line2")) : undefined,
    city: String(pick(raw, "city") ?? ""),
    state: String(pick(raw, "state", "province") ?? ""),
    postalCode: String(pick(raw, "postalCode", "postal_code", "pincode", "zip") ?? ""),
    country: String(pick(raw, "country") ?? "India"),
    phone: String(pick(raw, "phone") ?? phone),
    email: String(pick(raw, "email") ?? email),
  };
}

/**
 * Accepts both the camelCase shape used by our earlier adapter and Shiprocket's snake_case order
 * webhook (order_id, cart_data.items[{variant_id, quantity}], payment_type, total_amount_payable ...).
 */
export function normalizeCheckoutWebhook(payload: Raw): NormalizedCheckoutOrder | null {
  const nested: Raw | undefined = payload.order && typeof payload.order === "object" ? payload.order : undefined;
  const src: Raw = nested ?? payload;

  const externalOrderId = String(pick(src, "order_id", "orderId", "orderNumber", "id") ?? pick(payload, "order_id", "orderId") ?? "").trim();
  if (!externalOrderId) return null;

  const customerRaw: Raw | undefined = src.customer;
  const phone = normalizePhone(pick(customerRaw, "phone") ?? pick(src, "phone", "customer_phone", "mobile") ?? pick(src.shipping_address ?? src.shippingAddress, "phone"));
  const email = normalizeEmail(pick(customerRaw, "email") ?? pick(src, "email", "customer_email") ?? "");
  const shipRaw: Raw | undefined = src.shipping_address ?? src.shippingAddress;
  const billRaw: Raw | undefined = src.billing_address ?? src.billingAddress ?? shipRaw;
  const name = String(
    pick(customerRaw, "name") ??
      pick(src, "customer_name", "name") ??
      [pick(shipRaw, "first_name", "firstName"), pick(shipRaw, "last_name", "lastName")].filter(Boolean).join(" ") ??
      "Valued Customer"
  ).trim() || "Valued Customer";

  const paymentRaw: Raw | undefined = src.payment;
  const paymentTypeText = String(pick(paymentRaw, "method") ?? pick(src, "payment_type", "paymentType", "payment_method") ?? "").toLowerCase();
  const isCod = paymentTypeText.includes("cod") || paymentTypeText.includes("cash");

  const statusText = String(pick(src, "status", "payment_status", "paymentStatus") ?? pick(paymentRaw, "status") ?? "").toLowerCase();
  const eventType = String(pick(payload, "eventType", "event", "event_type") ?? "order.created");
  const failed = /fail|cancel|abandon/.test(statusText) || /fail/.test(eventType);
  const success = /success|paid|captured|complete|placed/.test(statusText) || isCod || /paid|success/.test(eventType);
  const outcome: NormalizedCheckoutOrder["outcome"] = failed ? "failed" : success ? "success" : "pending";

  const itemsRaw: Raw[] = src.items ?? src.cart_data?.items ?? src.cartData?.items ?? [];
  const lines = (Array.isArray(itemsRaw) ? itemsRaw : []).map((it) => ({
    variantId: pick(it, "variant_id", "variantId") !== undefined ? String(pick(it, "variant_id", "variantId")) : undefined,
    productRef: pick(it, "productId", "product_id", "slug") !== undefined ? String(pick(it, "productId", "product_id", "slug")) : undefined,
    sku: pick(it, "sku") !== undefined ? String(pick(it, "sku")) : undefined,
    name: pick(it, "name", "title") !== undefined ? String(pick(it, "name", "title")) : undefined,
    quantity: Math.max(1, Math.floor(Number(pick(it, "quantity", "qty") ?? 1))),
    unitPrice: pick(it, "price", "selling_price", "unit_price") !== undefined ? Number(pick(it, "price", "selling_price", "unit_price")) : undefined,
  }));

  const total = Number(pick(src, "total_amount_payable", "total", "amount", "grand_total") ?? pick(paymentRaw, "amount") ?? 0);

  return {
    externalOrderId,
    eventType,
    outcome,
    isCod,
    paymentStatus: outcome === "failed" ? "failed" : isCod ? "pending" : outcome === "success" ? "paid" : "pending",
    transactionId: pick(paymentRaw, "transactionId") ?? pick(src, "transaction_id", "transactionId", "payment_id"),
    customer: { name, email, phone },
    shipping: toAddress(shipRaw, name, phone, email),
    billing: toAddress(billRaw, name, phone, email),
    lines,
    total: Number.isFinite(total) ? total : 0,
    discount: Number(pick(src, "discount", "total_discount", "coupon_discount") ?? 0) || 0,
    shippingCost: Number(pick(src, "shipping_charges", "shipping_charge", "shippingFee", "shipping_cost") ?? 0) || 0,
    couponCode: pick(src, "coupon_code", "couponCode", "coupon"),
  };
}

// ───────────────────────── Order creation (atomic) ─────────────────────────

export type CreateOrderResult =
  | { status: "created"; order: Order; onHold: boolean }
  | { status: "duplicate" }
  | { status: "ignored"; reason: string };

function isUniqueViolation(err: unknown): boolean {
  return err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002";
}

async function upsertCustomerDoc(tx: Prisma.TransactionClient, n: NormalizedCheckoutOrder, orderTotal: number, orderId: string, now: string): Promise<string> {
  const byPhone = n.customer.phone
    ? await tx.document.findFirst({ where: { collection: "customers", data: { path: ["phone"], equals: n.customer.phone } } })
    : null;
  const byEmail = !byPhone && n.customer.email
    ? await tx.document.findFirst({ where: { collection: "customers", data: { path: ["email"], equals: n.customer.email } } })
    : null;
  const row = byPhone ?? byEmail;
  const [firstName, ...rest] = n.customer.name.split(" ");

  if (row) {
    const c = row.data as unknown as Customer;
    const updated: Customer = {
      ...c,
      totalOrders: (c.totalOrders || 0) + 1,
      totalSpent: (c.totalSpent || 0) + orderTotal,
      lastOrderId: orderId,
      lastOrderDate: now,
      updatedAt: now,
    };
    await tx.document.update({ where: { collection_id: { collection: "customers", id: c.id } }, data: { data: updated as unknown as Prisma.InputJsonValue } });
    return c.id;
  }

  const id = `cust-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
  const customer: Customer = {
    id,
    type: "retail",
    status: "active",
    firstName: firstName || "Customer",
    lastName: rest.join(" "),
    email: n.customer.email,
    phone: n.customer.phone,
    billing: n.billing,
    shipping: n.shipping,
    totalOrders: 1,
    totalSpent: orderTotal,
    lastOrderId: orderId,
    lastOrderDate: now,
    registeredAt: now,
    updatedAt: now,
  };
  await tx.document.create({ data: { collection: "customers", id, position: -Math.floor(Date.now() / 1000), data: customer as unknown as Prisma.InputJsonValue } });
  return id;
}

/**
 * Turns a verified Shiprocket Checkout order event into a stored order.
 * Everything (idempotency marker, stock, customer, order) commits or rolls back together, so a
 * crash can never leave a half-created order, and a retried webhook can never double-book stock.
 */
export async function createOrderFromCheckout(n: NormalizedCheckoutOrder, eventId: string, rawPayload: unknown): Promise<CreateOrderResult> {
  if (n.outcome === "failed") {
    await prisma.webhookEvent.create({
      data: { eventId, provider: "shiprocket_checkout", eventType: n.eventType, payload: { orderId: n.externalOrderId, outcome: "failed" }, status: "ignored" },
    }).catch((e) => { if (!isUniqueViolation(e)) throw e; });
    return { status: "ignored", reason: "payment failed / abandoned" };
  }
  if (!n.lines.length) return { status: "ignored", reason: "no items" };

  // Same Shiprocket order delivered twice under different event ids -> still one order.
  const existingOrder = await findOneByField<Order>("orders", "externalOrderId", n.externalOrderId);
  if (existingOrder) return { status: "duplicate" };

  const now = new Date().toISOString();
  const seq = await nextSequence("order", 10000);
  const orderId = `ord-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  const orderNumber = `ZI-${seq}`;

  try {
    return await prisma.$transaction(async (tx) => {
      await tx.webhookEvent.create({
        data: {
          eventId,
          provider: "shiprocket_checkout",
          eventType: n.eventType,
          payload: (rawPayload && typeof rawPayload === "object" ? JSON.parse(JSON.stringify(rawPayload)) : {}) as Prisma.InputJsonValue,
          status: "processed",
        },
      });

      const items: OrderItem[] = [];
      const notes: Order["notes"] = [];
      let onHold = false;
      let catalogSubtotal = 0;

      for (const line of n.lines) {
        let productId: string | undefined;
        let variationId: string | undefined;
        if (line.variantId) {
          const ref = await resolveVariantId(line.variantId);
          productId = ref?.productId;
          variationId = ref?.variationId;
        }
        productId ??= line.productRef;

        let product: Product | null = null;
        if (productId) {
          const row = await tx.document.findFirst({
            where: { collection: "products", OR: [{ id: productId }, { data: { path: ["slug"], equals: productId } }] },
          });
          product = row ? (row.data as unknown as Product) : null;
        }
        if (!product && line.sku) {
          const row = await tx.document.findFirst({ where: { collection: "products", data: { path: ["sku"], equals: line.sku } } });
          product = row ? (row.data as unknown as Product) : null;
        }

        if (!product) {
          onHold = true;
          notes.unshift({ id: `nte-${Date.now()}-${items.length}`, note: `Unknown product in Shiprocket order (variant ${line.variantId ?? line.productRef ?? line.sku ?? "?"}). Needs manual review.`, isCustomerNote: false, createdAt: now });
          items.push({ productId: String(line.productRef ?? line.variantId ?? "unknown"), name: line.name ?? "Unknown product", sku: line.sku ?? "", quantity: line.quantity, price: line.unitPrice ?? 0, discount: 0, tax: 0, total: (line.unitPrice ?? 0) * line.quantity });
          continue;
        }

        const variation = variationId ? product.variations?.find((v) => v.id === variationId) : undefined;
        const catalogPrice = variation?.salePrice ?? variation?.price ?? product.salePrice ?? product.price;
        if (line.unitPrice !== undefined && Math.abs(line.unitPrice - catalogPrice) > 1) {
          notes.unshift({ id: `nte-${Date.now()}-p${items.length}`, note: `Price mismatch for ${product.name}: Shiprocket ₹${line.unitPrice} vs catalogue ₹${catalogPrice}. Catalogue price used.`, isCustomerNote: false, createdAt: now });
        }

        const stock = await decrementProductStock(product.id, line.quantity, tx);
        if (!stock.ok) {
          onHold = true;
          notes.unshift({ id: `nte-${Date.now()}-s${items.length}`, note: `Insufficient stock for ${product.name} (wanted ${line.quantity}, available ${stock.stock ?? 0}). Order placed ON HOLD - restock or refund.`, isCustomerNote: false, createdAt: now });
        }

        catalogSubtotal += catalogPrice * line.quantity;
        items.push({
          productId: product.id,
          variationId,
          name: product.name,
          sku: variation?.sku ?? product.sku,
          quantity: line.quantity,
          price: catalogPrice,
          costPrice: product.costPrice,
          discount: 0,
          tax: 0,
          total: catalogPrice * line.quantity,
          image: variation?.image ?? product.images?.[0],
          attributes: variation?.attributes,
        });
      }

      const total = n.total > 0 ? n.total : Math.max(0, catalogSubtotal - n.discount + n.shippingCost);
      const customerId = await upsertCustomerDoc(tx, n, total, orderId, now);
      const method: PaymentMethod = n.isCod ? "cod" : "gateway";
      const status: OrderStatus = onHold ? "on_hold" : n.isCod ? "processing" : "paid";

      const order: Order & { externalOrderId: string } = {
        id: orderId,
        orderNumber,
        externalOrderId: n.externalOrderId,
        customerId,
        customerName: n.customer.name,
        customerEmail: n.customer.email,
        customerPhone: n.customer.phone,
        type: "retail",
        status,
        items,
        billing: n.billing,
        shipping: n.shipping,
        couponCode: n.couponCode,
        couponDiscount: n.discount,
        subtotal: catalogSubtotal,
        shippingCost: n.shippingCost,
        tax: 0,
        discount: n.discount,
        total,
        paymentMethod: method,
        paymentStatus: n.paymentStatus,
        transactionId: n.transactionId,
        notes,
        createdAt: now,
        updatedAt: now,
      };

      await tx.document.create({ data: { collection: "orders", id: orderId, position: -Math.floor(Date.now() / 1000), data: order as unknown as Prisma.InputJsonValue } });
      return { status: "created" as const, order, onHold };
    }, { timeout: 30_000, maxWait: 10_000 });
  } catch (err) {
    if (isUniqueViolation(err)) return { status: "duplicate" };
    throw err;
  }
}

// ───────────────────────── Cancellation / refunds / returns ─────────────────────────

const NOT_CANCELLABLE: OrderStatus[] = ["shipped", "out_for_delivery", "delivered", "returned", "return_requested", "return_approved"];

export type CancelResult =
  | { ok: true; order: Order; refund: RefundRecord | null; alreadyCancelled?: boolean }
  | { ok: false; code: "not_found" | "not_cancellable"; message: string };

/** Cancel an order exactly once, give the stock back, and queue a refund for prepaid orders. */
export async function cancelOrder(orderId: string, reason: string, actor: string): Promise<CancelResult> {
  const { found, result } = await updateDoc<Order, CancelResult>("orders", orderId, async (order, tx) => {
    if (order.status === "cancelled") return { doc: null, result: { ok: true, order, refund: null, alreadyCancelled: true } };
    if (NOT_CANCELLABLE.includes(order.status)) {
      return { doc: null, result: { ok: false, code: "not_cancellable", message: `Cannot cancel an order that is ${order.status.replace(/_/g, " ")}. Please request a return instead.` } };
    }

    const now = new Date().toISOString();
    const updated: Order = {
      ...order,
      status: "cancelled",
      notes: [{ id: `nte-${Date.now()}`, note: `Order cancelled by ${actor}. Reason: ${reason}`, isCustomerNote: false, createdAt: now }, ...(order.notes || [])],
      updatedAt: now,
    };

    for (const item of order.items) {
      if (item.productId) await restoreProductStock(item.productId, item.quantity, tx);
    }

    let refund: RefundRecord | null = null;
    if (order.paymentStatus === "paid") {
      updated.paymentStatus = "refund_pending";
      refund = {
        id: `ref-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        orderId: order.id,
        orderNumber: order.orderNumber,
        amount: order.total,
        reason: `Auto refund on order cancellation: ${reason}`,
        status: "REFUND_PENDING",
        createdAt: now,
        updatedAt: now,
      };
      await tx.document.create({ data: { collection: "refunds", id: refund.id, position: -Math.floor(Date.now() / 1000), data: refund as unknown as Prisma.InputJsonValue } });
    }
    return { doc: updated, result: { ok: true, order: updated, refund } };
  });

  if (!found || !result) return { ok: false, code: "not_found", message: "Order not found." };
  return result;
}

// ───────────────────────── Shipping status webhook ─────────────────────────

const RANK: Partial<Record<OrderStatus, number>> = {
  payment_pending: 0, paid: 1, processing: 2, on_hold: 1, shipped: 3, out_for_delivery: 4, delivered: 5,
};

export type ShipmentEvent = {
  statusText: string;
  awb?: string;
  courier?: string;
  trackingUrl?: string;
};

function mapShipmentStatus(text: string): { order?: OrderStatus; rto?: boolean; shipment: ShipmentRecord["status"] | null } {
  const t = text.toUpperCase();
  if (t.includes("RTO") || t.includes("RETURN TO ORIGIN") || t.includes("UNDELIVERED")) return { rto: true, shipment: "RTO" };
  if (t.includes("OUT FOR DELIVERY") || t.includes("OUT_FOR_DELIVERY")) return { order: "out_for_delivery", shipment: "OUT_FOR_DELIVERY" };
  if (t.includes("DELIVERED")) return { order: "delivered", shipment: "DELIVERED" };
  if (t.includes("IN TRANSIT") || t.includes("IN_TRANSIT") || t.includes("SHIPPED") || t.includes("DISPATCHED") || t.includes("PICKED")) return { order: "shipped", shipment: t.includes("PICKED") ? "PICKED_UP" : "IN_TRANSIT" };
  if (t.includes("CANCEL")) return { shipment: "CANCELLED" };
  return { shipment: null }; // unknown status: never rewrite the order with a guess
}

/** Apply a courier status without ever moving an order backwards. */
export async function applyShipmentEvent(orderRef: string, ev: ShipmentEvent): Promise<{ found: boolean; applied: boolean; status?: OrderStatus }> {
  const order = (await getDoc<Order>("orders", orderRef)) ?? (await findOneByField<Order>("orders", "orderNumber", orderRef)) ?? (await findOneByField<Order>("orders", "externalOrderId", orderRef));
  if (!order) return { found: false, applied: false };

  const mapped = mapShipmentStatus(ev.statusText);
  const now = new Date().toISOString();

  const { result } = await updateDoc<Order, { applied: boolean; status?: OrderStatus }>("orders", order.id, async (current, tx) => {
    let updated: Order = { ...current, updatedAt: now };
    let applied = false;

    if (ev.awb) { updated.trackingNumber = ev.awb; applied = true; }
    if (ev.courier) { updated.courierName = ev.courier; applied = true; }
    if (ev.trackingUrl) { updated.trackingUrl = ev.trackingUrl; applied = true; }

    if (mapped.order) {
      const curRank = RANK[current.status];
      const newRank = RANK[mapped.order] ?? 0;
      if (curRank !== undefined && newRank > curRank) {
        updated.status = mapped.order;
        if (mapped.order === "shipped") updated.shippingDate = now;
        if (mapped.order === "delivered") { updated.deliveredDate = now; if (current.paymentMethod === "cod") updated.paymentStatus = "paid"; }
        applied = true;
      }
    } else if (mapped.rto && !["returned", "cancelled", "refunded", "delivered"].includes(current.status)) {
      updated.status = "returned";
      updated.notes = [{ id: `nte-${Date.now()}`, note: "Courier reported RTO / undelivered. Stock restored.", isCustomerNote: false, createdAt: now }, ...(current.notes || [])];
      for (const item of current.items) if (item.productId) await restoreProductStock(item.productId, item.quantity, tx);
      if (current.paymentStatus === "paid") {
        updated.paymentStatus = "refund_pending";
        const refund: RefundRecord = { id: `ref-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`, orderId: current.id, orderNumber: current.orderNumber, amount: current.total, reason: "RTO - shipment returned to origin", status: "REFUND_PENDING", createdAt: now, updatedAt: now };
        await tx.document.create({ data: { collection: "refunds", id: refund.id, position: -Math.floor(Date.now() / 1000), data: refund as unknown as Prisma.InputJsonValue } });
      }
      applied = true;
    }

    return { doc: applied ? updated : null, result: { applied, status: updated.status } };
  });

  if (result?.applied && ev.awb) {
    const shipment: ShipmentRecord = {
      id: `shp-${order.id}`,
      orderId: order.id,
      orderNumber: order.orderNumber,
      courierName: ev.courier || order.courierName || "Shiprocket",
      trackingNumber: ev.awb,
      trackingUrl: ev.trackingUrl,
      status: mapped.shipment ?? "SHIPMENT_CREATED",
      shippedAt: mapped.order === "shipped" ? now : undefined,
      deliveredAt: mapped.order === "delivered" ? now : undefined,
      createdAt: now,
      updatedAt: now,
    };
    await upsertDoc("shipments", shipment);
  }

  return { found: true, applied: result?.applied ?? false, status: result?.status };
}
