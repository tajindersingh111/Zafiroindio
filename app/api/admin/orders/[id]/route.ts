import { NextRequest, NextResponse } from "next/server";
import { readCollection, writeCollection } from "@/lib/db/store";
import type { Order, OrderNote } from "@/lib/db/types";
import { v4 as uuidv4 } from "uuid";
import { requireSuperAdmin, getAuthSession } from "@/lib/auth/rbac";
import { createAuditLog } from "@/lib/db/audit";

export async function GET(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const orders = readCollection<Order>("orders");
  const order = orders.find((o) => o.id === id);
  if (!order) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json({ order });
}

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getAuthSession(request);
  const { id } = await params;
  const body = await request.json() as Partial<Order> & { addNote?: string; isCustomerNote?: boolean };
  const orders = readCollection<Order>("orders");
  const idx = orders.findIndex((o) => o.id === id);
  if (idx < 0) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const prev = orders[idx];
  const updatedOrder = { ...orders[idx], ...body, id, updatedAt: new Date().toISOString() };

  if (body.addNote) {
    const note: OrderNote = {
      id: uuidv4(),
      note: body.addNote,
      isCustomerNote: body.isCustomerNote ?? false,
      createdAt: new Date().toISOString(),
    };
    updatedOrder.notes = [...(orders[idx].notes ?? []), note];
  }

  delete (updatedOrder as Record<string, unknown>).addNote;
  delete (updatedOrder as Record<string, unknown>).isCustomerNote;

  orders[idx] = updatedOrder;
  writeCollection("orders", orders);

  // Sync Invoice Status
  const { generateInvoiceForOrder } = require("@/lib/db/invoices");
  generateInvoiceForOrder(updatedOrder);

  // AUDIT LOG
  createAuditLog({
    userId: session?.userId,
    userName: session?.email,
    userRole: session?.role,
    action: body.status ? "UPDATE_ORDER_STATUS" : "UPDATE_ORDER",
    module: "orders",
    recordId: id,
    previousData: { status: prev.status },
    updatedData: { status: updatedOrder.status }
  });

  return NextResponse.json({ order: orders[idx] });
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  // STRICT SUPER ADMIN DELETE REQUIREMENT
  const auth = await requireSuperAdmin(request);
  if (auth.error) return auth.error;

  const { id } = await params;
  let orders = readCollection<Order>("orders");
  const order = orders.find((o) => o.id === id);
  if (!order) return NextResponse.json({ error: "Not found" }, { status: 404 });

  orders = orders.filter((o) => o.id !== id);
  writeCollection("orders", orders);

  // AUDIT LOG
  createAuditLog({
    userId: auth.session?.userId,
    userName: auth.session?.email,
    userRole: auth.session?.role,
    action: "PERMANENT_DELETE_ORDER",
    module: "orders",
    recordId: id,
    previousData: order
  });

  return NextResponse.json({ success: true, message: "Order permanently deleted by Super Admin." });
}
