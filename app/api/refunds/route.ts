import { NextResponse } from "next/server";
import { readCollection, writeCollection } from "@/lib/db/store";
import type { Order, RefundRecord } from "@/lib/db/types";
import { sendTransactionalEmail } from "@/lib/email/service";

export async function GET() {
  const refunds = readCollection<RefundRecord>("refunds");
  return NextResponse.json({ refunds });
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { orderId, amount, reason = "Admin initiated refund" } = body;

    if (!orderId || !amount || amount <= 0) {
      return NextResponse.json({ error: "orderId and valid amount are required." }, { status: 400 });
    }

    const orders = readCollection<Order>("orders");
    const idx = orders.findIndex(o => o.id === orderId || o.orderNumber === orderId);

    if (idx < 0) {
      return NextResponse.json({ error: "Order not found." }, { status: 404 });
    }

    const order = orders[idx];
    const now = new Date().toISOString();

    const refunds = readCollection<RefundRecord>("refunds");
    const newRefund: RefundRecord = {
      id: `ref-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      orderId: order.id,
      orderNumber: order.orderNumber,
      amount: Number(amount),
      reason,
      status: "REFUNDED",
      gatewayRefundId: `rfnd_${Date.now()}`,
      createdAt: now,
      updatedAt: now,
    };

    refunds.unshift(newRefund);
    writeCollection("refunds", refunds);

    // Update order status
    order.paymentStatus = "refunded";
    order.status = "refunded";
    order.notes.unshift({
      id: `nte-${Date.now()}`,
      note: `Refund of ₹${amount} processed. Reason: ${reason}`,
      isCustomerNote: false,
      createdAt: now,
    });
    order.updatedAt = now;
    orders[idx] = order;
    writeCollection("orders", orders);

    // Dispatch refund confirmation email
    await sendTransactionalEmail("REFUND_COMPLETED", order, { refundAmount: Number(amount) });

    return NextResponse.json({ success: true, refund: newRefund, order }, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: "Failed to process refund." }, { status: 500 });
  }
}
