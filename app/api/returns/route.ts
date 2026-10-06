import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth/guard";
import { findOneByField, getDoc, readCollection, updateDoc, upsertDoc } from "@/lib/db/store";
import { orderMatchesContact } from "@/lib/orders/contact";
import { sendTransactionalEmail } from "@/lib/email/service";
import { rateLimit } from "@/lib/security/rate-limit";
import { createAuditLog } from "@/lib/db/audit";
import type { Order, ReturnRecord } from "@/lib/db/types";

export const dynamic = "force-dynamic";

const RETURN_WINDOW_DAYS = 7;
const STATUSES: ReturnRecord["status"][] = ["RETURN_REQUESTED", "RETURN_APPROVED", "RETURN_REJECTED", "RECEIVED", "COMPLETED"];

// Return list: staff only (it contains customer names and e-mails).
export async function GET(request: NextRequest) {
  const auth = await requireAdmin(request, "orders");
  if (auth.error) return auth.error;
  return NextResponse.json({ returns: await readCollection<ReturnRecord>("returns") });
}

// Customer return request: order number + the phone/e-mail used on the order.
export async function POST(request: NextRequest) {
  const limited = await rateLimit(request, "returns-create", { windowMs: 60_000, maxRequests: 5 });
  if (limited) return limited;

  try {
    const body = (await request.json()) as { orderId?: string; orderNumber?: string; contact?: string; reason?: string };
    const ref = body.orderNumber || body.orderId;
    const reason = typeof body.reason === "string" ? body.reason.trim().slice(0, 500) : "";
    if (!ref || !reason) return NextResponse.json({ error: "Order number and a reason are required." }, { status: 400 });

    const order = (await findOneByField<Order>("orders", "orderNumber", ref)) ?? (await getDoc<Order>("orders", ref));
    if (!order || !orderMatchesContact(order, body.contact)) {
      return NextResponse.json({ error: "We could not find an order matching those details." }, { status: 404 });
    }
    if (order.status !== "delivered") return NextResponse.json({ error: "Return requests are only allowed for delivered orders." }, { status: 400 });

    const deliveredAt = new Date(order.deliveredDate || order.updatedAt).getTime();
    if (Date.now() - deliveredAt > RETURN_WINDOW_DAYS * 86_400_000) {
      return NextResponse.json({ error: `The ${RETURN_WINDOW_DAYS}-day return window for this order has closed.` }, { status: 400 });
    }

    const existing = (await readCollection<ReturnRecord>("returns")).find((r) => r.orderId === order.id);
    if (existing) return NextResponse.json({ message: "Return request already submitted.", returnItem: { id: existing.id, status: existing.status } });

    const now = new Date().toISOString();
    const record: ReturnRecord = {
      id: `ret-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
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
    await upsertDoc("returns", record);
    await updateDoc<Order>("orders", order.id, (o) => ({
      doc: { ...o, status: "return_requested", updatedAt: now, notes: [{ id: `nte-${Date.now()}`, note: `Customer requested return. Reason: ${reason}`, isCustomerNote: true, createdAt: now }, ...(o.notes || [])] },
      result: undefined,
    }));
    await sendTransactionalEmail("RETURN_REQUESTED", order).catch(() => {});
    return NextResponse.json({ success: true, returnItem: { id: record.id, status: record.status } }, { status: 201 });
  } catch (error) {
    console.error("Return create failed:", error);
    return NextResponse.json({ error: "Failed to create return request." }, { status: 500 });
  }
}

// Staff: approve / reject / receive / complete a return.
export async function PATCH(request: NextRequest) {
  const auth = await requireAdmin(request, "orders");
  if (auth.error) return auth.error;

  const body = (await request.json().catch(() => ({}))) as { returnId?: string; status?: ReturnRecord["status"]; adminNotes?: string };
  if (!body.returnId || !body.status || !STATUSES.includes(body.status)) return NextResponse.json({ error: "returnId and a valid status are required." }, { status: 400 });

  const now = new Date().toISOString();
  const { found, result: item } = await updateDoc<ReturnRecord, ReturnRecord>("returns", body.returnId, (r) => {
    const updated: ReturnRecord = { ...r, status: body.status!, updatedAt: now };
    if (body.adminNotes) updated.adminNotes = String(body.adminNotes).slice(0, 500);
    if (body.status === "RETURN_APPROVED") updated.approvedDate = now;
    if (body.status === "RECEIVED" || body.status === "COMPLETED") updated.receivedDate = updated.receivedDate || now;
    return { doc: updated, result: updated };
  });
  if (!found || !item) return NextResponse.json({ error: "Return record not found." }, { status: 404 });

  const orderStatus = body.status === "RETURN_APPROVED" ? "return_approved" : body.status === "COMPLETED" ? "returned" : body.status === "RETURN_REJECTED" ? "delivered" : null;
  if (orderStatus) {
    await updateDoc<Order>("orders", item.orderId, (o) => ({ doc: { ...o, status: orderStatus, updatedAt: now }, result: undefined }));
  }
  await createAuditLog({ userId: auth.session.userId, userName: auth.session.email, userRole: auth.session.role, action: `RETURN_${body.status}`, module: "orders", recordId: item.orderId, recordName: item.orderNumber, riskLevel: "MEDIUM" });
  return NextResponse.json({ success: true, returnItem: item });
}
