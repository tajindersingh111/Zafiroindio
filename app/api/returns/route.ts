import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth/guard";
import { getDoc, readCollection, updateDoc, upsertDoc } from "@/lib/db/store";
import { sendTransactionalEmail } from "@/lib/email/service";
import { rateLimit } from "@/lib/security/rate-limit";
import { createAuditLog } from "@/lib/db/audit";
import { findReturnableOrder } from "@/lib/returns/eligibility";
import { VIDEOS, getVideo, tokenMatches, uploadedChunks, type ReturnVideo } from "@/lib/returns/video";
import type { Order, ReturnRecord } from "@/lib/db/types";

export const dynamic = "force-dynamic";

const STATUSES: ReturnRecord["status"][] = ["RETURN_REQUESTED", "RETURN_APPROVED", "RETURN_REJECTED", "RECEIVED", "COMPLETED"];

// Return list: staff only (it contains customer names and e-mails).
export async function GET(request: NextRequest) {
  const auth = await requireAdmin(request, "orders");
  if (auth.error) return auth.error;
  return NextResponse.json({ returns: await readCollection<ReturnRecord>("returns") });
}

/**
 * Customer return / exchange request: order number + the phone/e-mail used on the order, the
 * request type, a reason and the unboxing video (uploaded first through /api/returns/video).
 * Policy: only damaged products are returned, everything else is exchange, video is mandatory.
 */
export async function POST(request: NextRequest) {
  const limited = await rateLimit(request, "returns-create", { windowMs: 60_000, maxRequests: 5 });
  if (limited) return limited;

  try {
    const body = (await request.json()) as {
      orderId?: string; orderNumber?: string; contact?: string; reason?: string;
      kind?: string; items?: unknown; videoId?: string; uploadToken?: string;
    };
    const reason = typeof body.reason === "string" ? body.reason.trim().slice(0, 1000) : "";
    const kind: ReturnRecord["kind"] = body.kind === "return" ? "return" : body.kind === "exchange" ? "exchange" : undefined;
    if (!kind) return NextResponse.json({ error: "Choose return (damaged product) or exchange." }, { status: 400 });
    if (!reason) return NextResponse.json({ error: "Please describe the issue." }, { status: 400 });
    if (!body.videoId) return NextResponse.json({ error: "An unboxing video is required for every return or exchange." }, { status: 400 });

    const { order, error, status } = await findReturnableOrder(body.orderNumber || body.orderId, body.contact);
    if (!order) return NextResponse.json({ error }, { status });

    // A rejected request can be raised again (e.g. with a proper video) while the window is open.
    const existing = (await readCollection<ReturnRecord>("returns")).find((r) => r.orderId === order.id && r.status !== "RETURN_REJECTED");
    if (existing) return NextResponse.json({ message: "A request for this order is already submitted.", returnItem: { id: existing.id, status: existing.status } });

    const video = await getVideo(body.videoId);
    if (!video || video.orderId !== order.id || !tokenMatches(video, body.uploadToken) || video.status !== "uploading") {
      return NextResponse.json({ error: "Video upload not found. Please upload the video again." }, { status: 400 });
    }
    if ((await uploadedChunks(video.id)) < video.chunkCount) {
      return NextResponse.json({ error: "The video upload is not complete yet. Please upload it again." }, { status: 400 });
    }

    const orderItems = (order.items || []).map((i) => i.name);
    const items = Array.isArray(body.items) ? body.items.map(String).filter((n) => orderItems.includes(n)).slice(0, 20) : [];

    const now = new Date().toISOString();
    const record: ReturnRecord = {
      id: `ret-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      orderId: order.id,
      orderNumber: order.orderNumber,
      customerId: order.customerId,
      customerName: order.customerName,
      customerEmail: order.customerEmail,
      reason,
      kind,
      items: items.length ? items : orderItems,
      video: { id: video.id, mime: video.mime, size: video.size, name: video.name },
      status: "RETURN_REQUESTED",
      // Exchanges are never refunded; returns default to the order total (staff can refund less).
      refundAmount: kind === "return" ? order.total : 0,
      requestedDate: now,
      createdAt: now,
      updatedAt: now,
    };
    await upsertDoc("returns", record);
    await updateDoc<ReturnVideo>(VIDEOS, video.id, (v) => ({ doc: { ...v, status: "attached", returnId: record.id }, result: undefined }));
    const label = kind === "return" ? "return (damaged product)" : "exchange";
    await updateDoc<Order>("orders", order.id, (o) => ({
      doc: { ...o, status: "return_requested", updatedAt: now, notes: [{ id: `nte-${Date.now()}`, note: `Customer requested ${label} with unboxing video. Reason: ${reason}`, isCustomerNote: true, createdAt: now }, ...(o.notes || [])] },
      result: undefined,
    }));
    await sendTransactionalEmail("RETURN_REQUESTED", order, { requestKind: kind }).catch(() => {});
    return NextResponse.json({ success: true, returnItem: { id: record.id, status: record.status } }, { status: 201 });
  } catch (error) {
    console.error("Return create failed:", error);
    return NextResponse.json({ error: "Failed to create return request." }, { status: 500 });
  }
}

// Staff: approve / reject / receive / complete a return or exchange.
export async function PATCH(request: NextRequest) {
  const auth = await requireAdmin(request, "orders");
  if (auth.error) return auth.error;

  const body = (await request.json().catch(() => ({}))) as { returnId?: string; status?: ReturnRecord["status"]; adminNotes?: string; refundAmount?: number };
  if (!body.returnId || !body.status || !STATUSES.includes(body.status)) return NextResponse.json({ error: "returnId and a valid status are required." }, { status: 400 });

  const now = new Date().toISOString();
  const { found, result: item } = await updateDoc<ReturnRecord, ReturnRecord>("returns", body.returnId, (r) => {
    const updated: ReturnRecord = { ...r, status: body.status!, updatedAt: now };
    if (body.adminNotes) updated.adminNotes = String(body.adminNotes).slice(0, 500);
    if (typeof body.refundAmount === "number" && Number.isFinite(body.refundAmount) && body.refundAmount >= 0) updated.refundAmount = body.refundAmount;
    if (body.status === "RETURN_APPROVED" || body.status === "RETURN_REJECTED") {
      updated.decidedBy = auth.session.email;
      updated.decidedAt = now;
    }
    if (body.status === "RETURN_APPROVED") updated.approvedDate = now;
    if (body.status === "RECEIVED" || body.status === "COMPLETED") updated.receivedDate = updated.receivedDate || now;
    return { doc: updated, result: updated };
  });
  if (!found || !item) return NextResponse.json({ error: "Return record not found." }, { status: 404 });

  const orderStatus = body.status === "RETURN_APPROVED" ? "return_approved" : body.status === "COMPLETED" ? "returned" : body.status === "RETURN_REJECTED" ? "delivered" : null;
  if (orderStatus) {
    await updateDoc<Order>("orders", item.orderId, (o) => ({ doc: { ...o, status: orderStatus, updatedAt: now }, result: undefined }));
  }
  if (body.status === "RETURN_APPROVED" || body.status === "RETURN_REJECTED") {
    const order = await getDoc<Order>("orders", item.orderId);
    if (order) {
      await sendTransactionalEmail(body.status, order, { requestKind: item.kind ?? "return", note: item.adminNotes }).catch(() => {});
    }
  }
  await createAuditLog({ userId: auth.session.userId, userName: auth.session.email, userRole: auth.session.role, action: `RETURN_${body.status}`, module: "orders", recordId: item.orderId, recordName: item.orderNumber, riskLevel: "MEDIUM" });
  return NextResponse.json({ success: true, returnItem: item });
}
