import { NextRequest, NextResponse } from "next/server";
import { getDoc, updateDoc, deleteDoc } from "@/lib/db/store";
import type { Order, OrderNote } from "@/lib/db/types";
import { requireSuperAdmin, getAuthSession } from "@/lib/auth/rbac";
import { createAuditLog } from "@/lib/db/audit";
import { generateInvoiceForOrder } from "@/lib/db/invoices";
import { cancelOrder } from "@/lib/orders/service";
import { guarded } from "@/lib/auth/guard";

type Ctx = { params: Promise<{ id: string }> };

const STATUSES = new Set([
  "payment_pending", "paid", "processing", "shipped", "out_for_delivery", "delivered", "payment_failed", "cancelled",
  "refund_pending", "refunded", "return_requested", "return_approved", "returned", "on_hold", "completed", "failed",
]);
const PAYMENT_STATUSES = new Set(["pending", "paid", "failed", "partially_paid", "refunded", "refund_pending"]);
// Only these fields may be changed through the admin PATCH (no price/total/items/customer overwrite).
const EDITABLE_STRINGS = ["trackingNumber", "courierName", "trackingUrl", "shippingDate", "estimatedDelivery", "deliveredDate"] as const;

async function handleGET(_: Request, { params }: Ctx) {
  const { id } = await params;
  const order = await getDoc<Order>("orders", id);
  if (!order) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json({ order });
}

async function handlePATCH(request: NextRequest, { params }: Ctx) {
  const session = await getAuthSession(request);
  const { id } = await params;
  let body: Record<string, any>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }
  if (body.status !== undefined && !STATUSES.has(body.status)) return NextResponse.json({ error: "Invalid status." }, { status: 400 });
  if (body.paymentStatus !== undefined && !PAYMENT_STATUSES.has(body.paymentStatus)) return NextResponse.json({ error: "Invalid payment status." }, { status: 400 });

  const actor = session?.email || "admin";
  const existing = await getDoc<Order>("orders", id);
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

  // Cancelling must restock + queue the refund exactly once.
  if (body.status === "cancelled" && existing.status !== "cancelled") {
    const res = await cancelOrder(id, String(body.cancelReason || "Cancelled by staff"), actor);
    if (!res.ok) return NextResponse.json({ error: res.message }, { status: 409 });
    await createAuditLog({
      userId: session?.userId, userName: session?.name, userRole: session?.role,
      action: "CANCEL_ORDER", module: "orders", recordId: id,
      previousData: { status: existing.status }, updatedData: { status: "cancelled" },
    });
    return NextResponse.json({ order: res.order });
  }

  const { result: updated } = await updateDoc<Order, Order | null>("orders", id, (o) => {
    const next: Order = { ...o, updatedAt: new Date().toISOString() };
    if (body.status !== undefined) next.status = body.status;
    if (body.paymentStatus !== undefined) next.paymentStatus = body.paymentStatus;
    for (const k of EDITABLE_STRINGS) {
      if (typeof body[k] === "string") (next as any)[k] = body[k].slice(0, 500);
    }
    if (typeof body.addNote === "string" && body.addNote.trim()) {
      const note: OrderNote = {
        id: crypto.randomUUID(),
        note: body.addNote.trim().slice(0, 2000),
        isCustomerNote: !!body.isCustomerNote,
        createdAt: new Date().toISOString(),
      };
      next.notes = [...(o.notes ?? []), note];
    }
    return { doc: next, result: next };
  });
  if (!updated) return NextResponse.json({ error: "Not found" }, { status: 404 });

  await generateInvoiceForOrder(updated).catch((e) => console.error("invoice sync failed", e));
  await createAuditLog({
    userId: session?.userId, userName: session?.name, userRole: session?.role,
    action: body.status ? "UPDATE_ORDER_STATUS" : "UPDATE_ORDER", module: "orders", recordId: id,
    previousData: { status: existing.status }, updatedData: { status: updated.status },
  });
  return NextResponse.json({ order: updated });
}

async function handleDELETE(request: NextRequest, { params }: Ctx) {
  const auth = await requireSuperAdmin(request);
  if (auth.error) return auth.error;
  const { id } = await params;
  const order = await getDoc<Order>("orders", id);
  if (!order) return NextResponse.json({ error: "Not found" }, { status: 404 });
  await deleteDoc("orders", id);
  await createAuditLog({
    userId: auth.session?.userId, userName: auth.session?.email, userRole: auth.session?.role,
    action: "PERMANENT_DELETE_ORDER", module: "orders", recordId: id, previousData: order,
  });
  return NextResponse.json({ success: true, message: "Order permanently deleted by Super Admin." });
}

export const GET = guarded(handleGET);
export const PATCH = guarded(handlePATCH);
export const DELETE = guarded(handleDELETE);
