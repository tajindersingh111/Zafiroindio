import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth/guard";
import { createAuditLog } from "@/lib/db/audit";
import { getDoc, readCollection, updateDoc, upsertDoc } from "@/lib/db/store";
import { sendTransactionalEmail } from "@/lib/email/service";
import type { Order, RefundRecord } from "@/lib/db/types";
import { isSuperAdmin } from "@/lib/auth/rbac";

export const dynamic = "force-dynamic";

/** Refund ledger. Staff only: this used to be callable by anyone on the internet. */
export async function GET(request: NextRequest) {
  const auth = await requireAdmin(request, "orders");
  if (auth.error) return auth.error;
  return NextResponse.json({ refunds: await readCollection<RefundRecord>("refunds") });
}

/** Record a refund request for an order (does not move money by itself). */
export async function POST(request: NextRequest) {
  const auth = await requireAdmin(request, "orders");
  if (auth.error) return auth.error;

  try {
    const body = (await request.json()) as { orderId?: string; amount?: number; reason?: string };
    const amount = Number(body.amount);
    if (!body.orderId || !Number.isFinite(amount) || amount <= 0) {
      return NextResponse.json({ error: "orderId and a valid amount are required." }, { status: 400 });
    }
    const reason = (body.reason || "Admin initiated refund").toString().slice(0, 300);

    const orders = await readCollection<Order>("orders");
    const order = orders.find((o) => o.id === body.orderId || o.orderNumber === body.orderId);
    if (!order) return NextResponse.json({ error: "Order not found." }, { status: 404 });
    if (order.paymentStatus === "pending") return NextResponse.json({ error: "This order has not been paid, so there is nothing to refund." }, { status: 400 });

    const refunds = (await readCollection<RefundRecord>("refunds")).filter((r) => r.orderId === order.id && r.status !== "REFUND_FAILED");
    const alreadyRefunded = refunds.reduce((s, r) => s + r.amount, 0);
    if (alreadyRefunded + amount > order.total + 0.01) {
      return NextResponse.json({ error: `Refund exceeds the order total (₹${order.total}, ₹${alreadyRefunded} already refunded or pending).` }, { status: 400 });
    }

    const now = new Date().toISOString();
    const refund: RefundRecord = {
      id: `ref-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      orderId: order.id,
      orderNumber: order.orderNumber,
      amount,
      reason,
      status: "REFUND_PENDING",
      processedBy: auth.session.email,
      createdAt: now,
      updatedAt: now,
    };
    await upsertDoc("refunds", refund);
    await updateDoc<Order>("orders", order.id, (o) => ({
      doc: { ...o, paymentStatus: "refund_pending", updatedAt: now, notes: [{ id: `nte-${Date.now()}`, note: `Refund of ₹${amount} requested by ${auth.session.email}. Reason: ${reason}`, isCustomerNote: false, createdAt: now }, ...(o.notes || [])] },
      result: undefined,
    }));

    await createAuditLog({ userId: auth.session.userId, userName: auth.session.email, userRole: auth.session.role, action: "REFUND_REQUESTED", module: "orders", recordId: order.id, recordName: order.orderNumber, updatedData: { amount, reason }, riskLevel: "HIGH" });
    return NextResponse.json({ success: true, refund }, { status: 201 });
  } catch (error) {
    console.error("Refund create failed:", error);
    return NextResponse.json({ error: "Failed to create refund." }, { status: 500 });
  }
}

/**
 * Mark a refund as paid out (after you refunded it in the Shiprocket / gateway dashboard) or failed.
 * Only Super Admin can confirm a payout, and it needs the gateway reference.
 */
export async function PATCH(request: NextRequest) {
  const auth = await requireAdmin(request, "orders");
  if (auth.error) return auth.error;
  if (!isSuperAdmin(auth.session.role)) return NextResponse.json({ error: "Only Super Admin can confirm refund payouts." }, { status: 403 });

  const body = (await request.json().catch(() => ({}))) as { refundId?: string; status?: "REFUNDED" | "REFUND_FAILED"; gatewayRefundId?: string };
  if (!body.refundId || !["REFUNDED", "REFUND_FAILED"].includes(body.status || "")) return NextResponse.json({ error: "refundId and status (REFUNDED | REFUND_FAILED) are required." }, { status: 400 });
  if (body.status === "REFUNDED" && !body.gatewayRefundId) return NextResponse.json({ error: "gatewayRefundId (payout reference) is required to confirm a refund." }, { status: 400 });

  const now = new Date().toISOString();
  const { found, result: refund } = await updateDoc<RefundRecord, RefundRecord | null>("refunds", body.refundId, (r) => {
    if (r.status !== "REFUND_PENDING") return { doc: null, result: null };
    const updated: RefundRecord = { ...r, status: body.status!, gatewayRefundId: body.gatewayRefundId, processedBy: auth.session.email, updatedAt: now };
    return { doc: updated, result: updated };
  });
  if (!found) return NextResponse.json({ error: "Refund not found." }, { status: 404 });
  if (!refund) return NextResponse.json({ error: "Only pending refunds can be updated." }, { status: 409 });

  const order = await getDoc<Order>("orders", refund.orderId);
  if (order && refund.status === "REFUNDED") {
    const refunded = (await readCollection<RefundRecord>("refunds")).filter((r) => r.orderId === order.id && r.status === "REFUNDED").reduce((s, r) => s + r.amount, 0);
    const full = refunded + 0.01 >= order.total;
    await upsertDoc("orders", { ...order, paymentStatus: full ? "refunded" : "paid", status: full && !["cancelled", "returned"].includes(order.status) ? "refunded" : order.status, updatedAt: now });
    await sendTransactionalEmail("REFUND_COMPLETED", order, { refundAmount: refund.amount }).catch(() => {});
  }
  await createAuditLog({ userId: auth.session.userId, userName: auth.session.email, userRole: auth.session.role, action: `REFUND_${refund.status}`, module: "orders", recordId: refund.orderId, recordName: refund.orderNumber, updatedData: { amount: refund.amount, gatewayRefundId: body.gatewayRefundId }, riskLevel: "HIGH" });
  return NextResponse.json({ success: true, refund });
}
