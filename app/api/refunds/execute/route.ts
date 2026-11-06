import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireAdmin } from "@/lib/auth/guard";
import { isSuperAdmin } from "@/lib/auth/rbac";
import { createAuditLog } from "@/lib/db/audit";
import { getDoc, readCollection, updateDoc, upsertDoc } from "@/lib/db/store";
import { sendTransactionalEmail } from "@/lib/email/service";
import { createRazorpayRefund, isRazorpayConfigured, RazorpayApiError } from "@/lib/payments/razorpay";
import type { Order, RefundRecord } from "@/lib/db/types";

export const dynamic = "force-dynamic";

const bodySchema = z.object({ refundId: z.string().min(3).max(120) });

/**
 * Pushes a pending refund through Razorpay, so the money actually goes back.
 *
 * The older flow (POST / PATCH on /api/refunds) records a refund and then waits for a Super Admin
 * to pay it out by hand in the gateway dashboard. That is still the path for COD and legacy
 * Fastrr orders. For a Razorpay order this does it in one step and stores the real refund id.
 *
 * Super Admin only: it moves money.
 *
 * Double-click safety: the record is moved to REFUND_PROCESSING **before** the gateway is called,
 * and that transition is atomic (updateDoc locks the row), so a second request finds it no longer
 * pending and stops. If the call then fails, the record goes back to REFUND_PENDING.
 */
export async function POST(request: NextRequest) {
  const auth = await requireAdmin(request, "orders");
  if (auth.error) return auth.error;
  if (!isSuperAdmin(auth.session.role)) {
    return NextResponse.json({ error: "Only Super Admin can send a refund to the payment gateway." }, { status: 403 });
  }
  if (!isRazorpayConfigured()) {
    return NextResponse.json({ error: "Razorpay is not configured on this server." }, { status: 503 });
  }

  const parsed = bodySchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "refundId is required." }, { status: 400 });

  const existing = await getDoc<RefundRecord>("refunds", parsed.data.refundId);
  if (!existing) return NextResponse.json({ error: "Refund not found." }, { status: 404 });

  const order = await getDoc<Order>("orders", existing.orderId);
  if (!order) return NextResponse.json({ error: "Order not found." }, { status: 404 });

  const paymentId = order.razorpayPaymentId;
  if (!paymentId) {
    return NextResponse.json(
      { error: "This order was not paid through Razorpay, so it has to be refunded by hand and confirmed with PATCH /api/refunds." },
      { status: 409 }
    );
  }

  // Claim the refund atomically: only one request can take it out of REFUND_PENDING.
  const now = new Date().toISOString();
  const { result: claimed } = await updateDoc<RefundRecord, RefundRecord | null>("refunds", existing.id, (r) => {
    if (r.status !== "REFUND_PENDING") return { doc: null, result: null };
    const updated: RefundRecord = { ...r, status: "REFUND_PROCESSING", processedBy: auth.session.email, gateway: "razorpay", updatedAt: now };
    return { doc: updated, result: updated };
  });
  if (!claimed) {
    return NextResponse.json({ error: "This refund is not pending — it may already have been sent." }, { status: 409 });
  }

  try {
    const result = await createRazorpayRefund(paymentId, claimed.amount, {
      orderNumber: order.orderNumber,
      refundId: claimed.id,
    });

    const paidAt = new Date().toISOString();
    const refunded: RefundRecord = {
      ...claimed,
      status: "REFUNDED",
      gatewayRefundId: result.id,
      gateway: "razorpay",
      updatedAt: paidAt,
    };
    await upsertDoc("refunds", refunded);

    // Full refund (counting everything already refunded) moves the order itself to refunded.
    const refundedTotal = (await readCollection<RefundRecord>("refunds"))
      .filter((r) => r.orderId === order.id && r.status === "REFUNDED")
      .reduce((sum, r) => sum + r.amount, 0);
    const full = refundedTotal + 0.01 >= order.total;

    await upsertDoc("orders", {
      ...order,
      paymentStatus: full ? "refunded" : "paid",
      status: full && !["cancelled", "returned"].includes(order.status) ? "refunded" : order.status,
      notes: [
        {
          id: `nte-${Date.now()}`,
          note: `Razorpay refund of ₹${claimed.amount} sent by ${auth.session.email}. Refund id ${result.id}.`,
          isCustomerNote: false,
          createdAt: paidAt,
        },
        ...(order.notes || []),
      ],
      updatedAt: paidAt,
    });

    await sendTransactionalEmail("REFUND_COMPLETED", order, { refundAmount: claimed.amount }).catch((e) =>
      console.error("Refund email failed:", e)
    );
    await createAuditLog({
      userId: auth.session.userId,
      userName: auth.session.email,
      userRole: auth.session.role,
      action: "REFUND_SENT_RAZORPAY",
      module: "orders",
      recordId: order.id,
      recordName: order.orderNumber,
      updatedData: { amount: claimed.amount, gatewayRefundId: result.id },
      riskLevel: "HIGH",
    });

    return NextResponse.json({ success: true, refund: refunded });
  } catch (e) {
    // The gateway refused: hand the refund back so it can be retried or paid out by hand.
    const message = e instanceof RazorpayApiError ? e.message : "The payment gateway could not process this refund.";
    await upsertDoc("refunds", {
      ...claimed,
      status: "REFUND_PENDING",
      failureReason: message.slice(0, 300),
      updatedAt: new Date().toISOString(),
    });
    await createAuditLog({
      userId: auth.session.userId,
      userName: auth.session.email,
      userRole: auth.session.role,
      action: "REFUND_GATEWAY_FAILED",
      module: "orders",
      recordId: order.id,
      recordName: order.orderNumber,
      updatedData: { amount: claimed.amount, error: message },
      status: "failed",
      riskLevel: "HIGH",
    });
    console.error("[refund] Razorpay refund failed:", e);
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
