import { NextRequest, NextResponse } from "next/server";
import { readCollection } from "@/lib/db/store";
import { getInvoiceByOrderId, generateInvoiceForOrder } from "@/lib/db/invoices";
import { createAuditLog } from "@/lib/db/audit";
import { getAuthSession } from "@/lib/auth/rbac";
import type { Order } from "@/lib/db/types";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getAuthSession(request);
    const { id } = await params;
    const orders = readCollection<Order>("orders");
    const order = orders.find((o) => o.id === id || o.orderNumber === id);

    if (!order) {
      return NextResponse.json({ error: "Order not found." }, { status: 404 });
    }

    let invoice = getInvoiceByOrderId(order.id, order);

    if (!invoice) {
      invoice = generateInvoiceForOrder(order);
    }

    // AUDIT LOG
    createAuditLog({
      userId: session?.userId || "usr-admin",
      userName: session?.email || "Admin User",
      userRole: session?.role || "admin",
      action: "VIEW_INVOICE",
      module: "orders",
      recordId: invoice.id,
      recordName: invoice.invoiceNumber,
      status: "success",
      riskLevel: "LOW"
    });

    return NextResponse.json({ invoice, order });
  } catch (err) {
    console.error("Error retrieving invoice:", err);
    return NextResponse.json({ error: "Failed to load invoice." }, { status: 500 });
  }
}
