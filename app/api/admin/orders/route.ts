import { NextResponse } from "next/server";
import { readCollection, writeCollection } from "@/lib/db/store";
import type { Order } from "@/lib/db/types";

async function handleGET(request: Request) {
  const { searchParams } = new URL(request.url);
  const search = searchParams.get("search")?.toLowerCase() ?? "";
  const status = searchParams.get("status") ?? "";
  const paymentMethod = searchParams.get("paymentMethod") ?? "";
  const type = searchParams.get("type") ?? "";
  const dateFrom = searchParams.get("dateFrom") ?? "";
  const dateTo = searchParams.get("dateTo") ?? "";
  const page = parseInt(searchParams.get("page") ?? "1");
  const pageSize = parseInt(searchParams.get("pageSize") ?? "20");

  let orders = await readCollection<Order>("orders");

  if (search) {
    orders = orders.filter(
      (o) =>
        o.orderNumber.toLowerCase().includes(search) ||
        o.customerName.toLowerCase().includes(search) ||
        o.customerEmail.toLowerCase().includes(search)
    );
  }
  if (status) orders = orders.filter((o) => o.status === status);
  if (paymentMethod) orders = orders.filter((o) => o.paymentMethod === paymentMethod);
  if (type) orders = orders.filter((o) => o.type === type);
  if (dateFrom) orders = orders.filter((o) => new Date(o.createdAt) >= new Date(dateFrom));
  if (dateTo) orders = orders.filter((o) => new Date(o.createdAt) <= new Date(dateTo + "T23:59:59Z"));

  // Sort newest first
  orders.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  const total = orders.length;
  const start = (page - 1) * pageSize;
  const paginated = orders.slice(start, start + pageSize);

  return NextResponse.json({ orders: paginated, total, page, pageSize, totalPages: Math.ceil(total / pageSize) });
}

import { priceCart, CartError } from "@/lib/pricing";
import { decrementProductStock, restoreProductStock, nextSequence, readSettings, upsertDoc } from "@/lib/db/store";
import { calculateShippingAndCodFee } from "@/lib/shipping/calculator";
import { generateInvoiceForOrder } from "@/lib/db/invoices";
import { sendTransactionalEmail } from "@/lib/email/service";
import { getAuthSession } from "@/lib/auth/rbac";
import { createAuditLog } from "@/lib/db/audit";
import type { Product, StoreSettings } from "@/lib/db/types";
import { guarded } from "@/lib/auth/guard";

/**
 * Staff-created order (phone / B2B / offline). Prices always come from the database; stock is
 * decremented atomically; order numbers come from an atomic counter.
 */
async function handlePOST(request: Request) {
  const restock: { productId: string; qty: number }[] = [];
  try {
    const session = (await getAuthSession(request))!;
    const body = (await request.json()) as Record<string, any>;
    const now = new Date().toISOString();

    const customerName = String(body.customerName || "").trim();
    const customerEmail = String(body.customerEmail || "").trim();
    const customerPhone = String(body.customerPhone || "").trim();
    const billing = body.billing || {};
    const shipping = body.shipping || {};

    if (customerName.length < 2) return NextResponse.json({ error: "Invalid customer name. Minimum 2 characters required." }, { status: 400 });
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(customerEmail)) return NextResponse.json({ error: "Invalid email address format." }, { status: 400 });
    if (!/^[0-9\s\-+()]{8,15}$/.test(customerPhone)) return NextResponse.json({ error: "Invalid contact phone number format." }, { status: 400 });
    if (!shipping.address1 || !shipping.city || !shipping.state || !shipping.postalCode) {
      return NextResponse.json({ error: "Missing required shipping address fields." }, { status: 400 });
    }
    if (!Array.isArray(body.items) || body.items.length === 0) return NextResponse.json({ error: "Shopping cart is empty." }, { status: 400 });

    // Trusted pricing (DB only) + stock availability check.
    const priced = await priceCart(
      body.items.map((i: any) => ({ productId: String(i.productId), qty: Number(i.quantity ?? i.qty), size: i.size, color: i.color }))
    );

    const paymentMethod = ["cod", "upi", "card", "netbanking", "wallet", "gateway", "partial"].includes(body.paymentMethod) ? body.paymentMethod : "cod";
    const products = await readCollectionProducts();
    const productsMap = new Map<string, Product>();
    products.forEach((p) => { productsMap.set(p.id, p); productsMap.set(p.slug, p); });
    const storeSettings = (await readSettings<StoreSettings>("settings")) ?? undefined;
    const shippingResult = calculateShippingAndCodFee({
      items: priced.items.map((i) => ({ productId: i.productId, quantity: i.quantity, price: i.price })),
      productsMap,
      paymentMethod,
      storeSettings,
    });
    if (!shippingResult.isAllowed) return NextResponse.json({ error: shippingResult.error }, { status: 400 });

    const discount = Math.max(0, Math.min(Number(body.discount) || 0, priced.subtotal));
    const computedShipping = shippingResult.totalShippingCost;
    const computedTotal = priced.subtotal + computedShipping - discount;

    // Atomically reserve stock for every line (rolled back below if anything fails).
    for (const line of priced.items) {
      const res = await decrementProductStock(line.productId, line.quantity);
      if (!res.ok) {
        for (const r of restock) await restoreProductStock(r.productId, r.qty);
        return NextResponse.json({ error: `Insufficient stock for ${line.name}.` }, { status: 409 });
      }
      restock.push({ productId: line.productId, qty: line.quantity });
    }

    const seq = await nextSequence("order", 10000);
    const addr = (a: any) => ({
      firstName: a.firstName || customerName.split(" ")[0],
      lastName: a.lastName || customerName.split(" ").slice(1).join(" "),
      address1: a.address1 || shipping.address1,
      address2: a.address2 || shipping.address2,
      city: a.city || shipping.city,
      state: a.state || shipping.state,
      postalCode: a.postalCode || shipping.postalCode,
      country: a.country || "India",
      phone: a.phone || customerPhone,
      email: a.email || customerEmail,
    });

    const newOrder: Order = {
      id: `ord-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      orderNumber: `ZI-${seq}`,
      customerId: body.customerId,
      customerName,
      customerEmail,
      customerPhone,
      type: body.type === "b2b" ? "b2b" : "retail",
      status: paymentMethod === "cod" ? "processing" : "payment_pending",
      items: priced.items.map((l) => ({
        productId: l.productId,
        name: l.name,
        sku: l.sku,
        quantity: l.quantity,
        price: l.price,
        costPrice: productsMap.get(l.productId)?.costPrice || 0,
        discount: 0,
        tax: 0,
        total: l.total,
        image: l.image,
        attributes: [
          ...(l.size ? [{ name: "Size", value: l.size }] : []),
          ...(l.color ? [{ name: "Color", value: l.color }] : []),
        ],
      })) as Order["items"],
      billing: addr(billing),
      shipping: addr(shipping),
      couponCode: body.couponCode,
      couponDiscount: discount,
      subtotal: priced.subtotal,
      shippingCost: computedShipping,
      tax: 0,
      discount,
      total: computedTotal,
      costSnapshot: {
        shippingCost: computedShipping,
        paymentFee: paymentMethod === "cod" ? 60 : Math.round(computedTotal * 0.02),
        packagingCost: 50,
        marketingAttributionCost: 0,
        otherOrderCost: 0,
      },
      paymentMethod,
      // Staff may only mark an order paid if they explicitly say so; online payments are confirmed by the gateway webhook.
      paymentStatus: body.paymentStatus === "paid" ? "paid" : "pending",
      transactionId: typeof body.transactionId === "string" ? body.transactionId : undefined,
      notes: [],
      createdAt: now,
      updatedAt: now,
    };

    await upsertDoc<Order>("orders", newOrder);
    await createAuditLog({
      userId: session.userId,
      userName: session.name,
      userRole: session.role,
      action: "ORDER_CREATED_MANUAL",
      module: "orders",
      recordId: newOrder.id,
      recordName: newOrder.orderNumber,
      updatedData: { total: newOrder.total },
    }).catch(() => {});

    let invoice = null;
    try {
      invoice = await generateInvoiceForOrder(newOrder);
      await sendTransactionalEmail("ORDER_CREATED", newOrder);
      if (invoice) await sendTransactionalEmail("INVOICE_GENERATED", newOrder, { invoiceNumber: invoice.invoiceNumber });
    } catch (e) {
      console.error("Post-order side effects failed:", e);
    }

    return NextResponse.json({ order: newOrder, invoice }, { status: 201 });
  } catch (err) {
    for (const r of restock) await restoreProductStock(r.productId, r.qty).catch(() => {});
    if (err instanceof CartError) return NextResponse.json({ error: err.message }, { status: err.status });
    console.error(err);
    return NextResponse.json({ error: "Failed to create order." }, { status: 500 });
  }
}

async function readCollectionProducts(): Promise<Product[]> {
  return readCollection<Product>("products");
}

export const GET = guarded(handleGET);
export const POST = guarded(handlePOST);
