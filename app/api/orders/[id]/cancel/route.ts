import { NextResponse } from "next/server";
import { readCollection, writeCollection } from "@/lib/db/store";
import type { Order, RefundRecord } from "@/lib/db/types";
import { sendTransactionalEmail } from "@/lib/email/service";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json().catch(() => ({}));
    const reason = body.reason || "Customer requested cancellation";

    const orders = readCollection<Order>("orders");
    const idx = orders.findIndex(o => o.id === id || o.orderNumber === id);

    if (idx < 0) {
      return NextResponse.json({ error: "Order not found." }, { status: 404 });
    }

    const order = orders[idx];

    // Cancellation Business Rules: Not allowed if shipped or delivered
    if (["shipped", "out_for_delivery", "delivered"].includes(order.status)) {
      return NextResponse.json({
        error: `Cannot cancel order in ${order.status.toUpperCase()} stage. Please initiate a return request instead.`
      }, { status: 400 });
    }

    if (order.status === "cancelled") {
      return NextResponse.json({ message: "Order is already cancelled." }, { status: 200 });
    }

    const now = new Date().toISOString();
    order.status = "cancelled";
    order.notes.unshift({
      id: `nte-${Date.now()}`,
      note: `Order cancelled. Reason: ${reason}`,
      isCustomerNote: false,
      createdAt: now,
    });
    order.updatedAt = now;

    // Handle refund if payment was already made
    let refund: RefundRecord | null = null;
    if (order.paymentStatus === "paid") {
      order.paymentStatus = "refund_pending";
      
      const refunds = readCollection<RefundRecord>("refunds");
      refund = {
        id: `ref-${Date.now()}`,
        orderId: order.id,
        orderNumber: order.orderNumber,
        amount: order.total,
        reason: `Auto refund on order cancellation: ${reason}`,
        status: "REFUND_PENDING",
        createdAt: now,
        updatedAt: now,
      };
      refunds.unshift(refund);
      writeCollection("refunds", refunds);
    }

    orders[idx] = order;
    writeCollection("orders", orders);

    // Dispatch email
    await sendTransactionalEmail("ORDER_CANCELLED", order);
    if (refund) {
      await sendTransactionalEmail("REFUND_COMPLETED", order, { refundAmount: refund.amount });
    }

    return NextResponse.json({ success: true, order, refund });
  } catch (error) {
    return NextResponse.json({ error: "Failed to cancel order." }, { status: 500 });
  }
}
