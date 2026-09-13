import { NextResponse } from "next/server";
import { readCollection, writeCollection } from "@/lib/db/store";
import type { Order, ReturnRecord } from "@/lib/db/types";
import { sendTransactionalEmail } from "@/lib/email/service";

export async function GET() {
  const returns = readCollection<ReturnRecord>("returns");
  return NextResponse.json({ returns });
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { orderId, reason } = body;

    if (!orderId || !reason) {
      return NextResponse.json({ error: "orderId and reason are required." }, { status: 400 });
    }

    const orders = readCollection<Order>("orders");
    const idx = orders.findIndex(o => o.id === orderId || o.orderNumber === orderId);

    if (idx < 0) {
      return NextResponse.json({ error: "Order not found." }, { status: 404 });
    }

    const order = orders[idx];

    if (order.status !== "delivered") {
      return NextResponse.json({ error: "Return requests are only allowed for delivered orders." }, { status: 400 });
    }

    const now = new Date().toISOString();
    const returns = readCollection<ReturnRecord>("returns");

    const existingReturn = returns.find(r => r.orderId === order.id);
    if (existingReturn) {
      return NextResponse.json({ message: "Return request already submitted.", returnItem: existingReturn }, { status: 200 });
    }

    const newReturn: ReturnRecord = {
      id: `ret-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      orderId: order.id,
      orderNumber: order.orderNumber,
      customerId: order.customerId,
      customerName: order.customerName,
      customerEmail: order.customerEmail,
      reason,
      status: "RETURN_REQUESTED",
      refundAmount: order.total,
      requestedDate: now,
      createdAt: now,
      updatedAt: now,
    };

    returns.unshift(newReturn);
    writeCollection("returns", returns);

    // Update order status
    order.status = "return_requested";
    order.notes.unshift({
      id: `nte-${Date.now()}`,
      note: `Customer requested return. Reason: ${reason}`,
      isCustomerNote: true,
      createdAt: now,
    });
    order.updatedAt = now;
    orders[idx] = order;
    writeCollection("orders", orders);

    await sendTransactionalEmail("RETURN_REQUESTED", order);

    return NextResponse.json({ success: true, returnItem: newReturn, order }, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: "Failed to create return request." }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  try {
    const body = await request.json();
    const { returnId, status: newStatus, adminNotes } = body;

    if (!returnId || !newStatus) {
      return NextResponse.json({ error: "returnId and status are required." }, { status: 400 });
    }

    const returns = readCollection<ReturnRecord>("returns");
    const idx = returns.findIndex(r => r.id === returnId);

    if (idx < 0) {
      return NextResponse.json({ error: "Return record not found." }, { status: 404 });
    }

    const item = returns[idx];
    const now = new Date().toISOString();

    item.status = newStatus;
    if (adminNotes) item.adminNotes = adminNotes;
    if (newStatus === "RETURN_APPROVED") item.approvedDate = now;
    if (newStatus === "RECEIVED" || newStatus === "COMPLETED") item.receivedDate = now;
    item.updatedAt = now;

    returns[idx] = item;
    writeCollection("returns", returns);

    // Sync order status
    const orders = readCollection<Order>("orders");
    const orderIdx = orders.findIndex(o => o.id === item.orderId);
    if (orderIdx >= 0) {
      const order = orders[orderIdx];
      if (newStatus === "RETURN_APPROVED") order.status = "return_approved";
      if (newStatus === "COMPLETED") order.status = "returned";
      order.updatedAt = now;
      orders[orderIdx] = order;
      writeCollection("orders", orders);
    }

    return NextResponse.json({ success: true, returnItem: item });
  } catch (error) {
    return NextResponse.json({ error: "Failed to update return." }, { status: 500 });
  }
}
