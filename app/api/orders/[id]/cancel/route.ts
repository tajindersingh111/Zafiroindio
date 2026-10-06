import { NextRequest, NextResponse } from "next/server";
import { findOneByField, getDoc } from "@/lib/db/store";
import { cancelOrder } from "@/lib/orders/service";
import { orderMatchesContact } from "@/lib/orders/contact";
import { sendTransactionalEmail } from "@/lib/email/service";
import { rateLimit } from "@/lib/security/rate-limit";
import { createAuditLog } from "@/lib/db/audit";
import type { Order } from "@/lib/db/types";

export const dynamic = "force-dynamic";

/** Customer self-service cancel. Needs the order number AND the phone/e-mail it was placed with. */
export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const limited = await rateLimit(request, "order-cancel", { windowMs: 60_000, maxRequests: 5 });
  if (limited) return limited;

  const { id } = await params;
  const body = (await request.json().catch(() => ({}))) as { reason?: unknown; contact?: unknown };
  const reason = typeof body.reason === "string" && body.reason.trim() ? body.reason.trim().slice(0, 300) : "Customer requested cancellation";

  const order = (await findOneByField<Order>("orders", "orderNumber", id)) ?? (await getDoc<Order>("orders", id));
  // Same answer for "no such order" and "wrong contact" so order numbers cannot be probed.
  if (!order || !orderMatchesContact(order, body.contact)) {
    return NextResponse.json({ error: "We could not find an order matching those details." }, { status: 404 });
  }

  try {
    const result = await cancelOrder(order.id, reason, "customer");
    if (!result.ok) return NextResponse.json({ error: result.message }, { status: result.code === "not_found" ? 404 : 400 });
    if (result.alreadyCancelled) return NextResponse.json({ message: "Order is already cancelled.", order: { orderNumber: result.order.orderNumber, status: result.order.status } });

    await createAuditLog({ userId: "customer", userName: order.customerEmail, userRole: "customer", action: "ORDER_CANCELLED_BY_CUSTOMER", module: "orders", recordId: order.id, recordName: order.orderNumber, updatedData: { reason }, riskLevel: "MEDIUM" });
    await sendTransactionalEmail("ORDER_CANCELLED", result.order).catch(() => {});

    return NextResponse.json({ success: true, order: { orderNumber: result.order.orderNumber, status: result.order.status, paymentStatus: result.order.paymentStatus }, refundPending: !!result.refund });
  } catch (error) {
    console.error("Cancel order failed:", error);
    return NextResponse.json({ error: "Failed to cancel order." }, { status: 500 });
  }
}
