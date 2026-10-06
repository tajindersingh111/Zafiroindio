import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth/guard";
import { deleteDoc, readCollection, updateDoc, upsertDoc } from "@/lib/db/store";
import { rateLimit } from "@/lib/security/rate-limit";
import { createAuditLog } from "@/lib/db/audit";

export const dynamic = "force-dynamic";

export type BulkOrderInquiry = {
  id: string;
  name: string;
  email: string;
  phone: string;
  category: string;
  quantity: string;
  businessName?: string;
  notes?: string;
  status: "PENDING" | "CONTACTED" | "QUOTED" | "COMPLETED" | "REJECTED";
  createdAt: string;
  adminNotes?: string;
};

const COLLECTION = "bulk_orders";
const STATUSES: BulkOrderInquiry["status"][] = ["PENDING", "CONTACTED", "QUOTED", "COMPLETED", "REJECTED"];
const EMAIL_RE = /^[^\s@]{1,64}@[^\s@]{1,255}\.[^\s@]{2,}$/;
const clean = (v: unknown, max: number) => (typeof v === "string" ? v.trim().slice(0, max) : "");

// Staff only: inquiries contain names, phone numbers and e-mails.
export async function GET(request: NextRequest) {
  const auth = await requireAdmin(request, "b2b");
  if (auth.error) return auth.error;
  const list = await readCollection<BulkOrderInquiry>(COLLECTION);
  return NextResponse.json({ success: true, inquiries: [...list].sort((a, b) => +new Date(b.createdAt) - +new Date(a.createdAt)) });
}

// Public inquiry form.
export async function POST(req: NextRequest) {
  const limited = await rateLimit(req, "bulk-inquiry", { windowMs: 60 * 60_000, maxRequests: 5 });
  if (limited) return limited;

  try {
    const body = (await req.json()) as Record<string, unknown>;
    const name = clean(body.name, 100);
    const phone = clean(body.phone, 20);
    const email = clean(body.email, 254).toLowerCase();
    if (!name || phone.replace(/\D/g, "").length < 10) return NextResponse.json({ error: "Name and a valid phone number are required." }, { status: 400 });
    if (email && !EMAIL_RE.test(email)) return NextResponse.json({ error: "Please enter a valid e-mail address." }, { status: 400 });

    const inquiry: BulkOrderInquiry = {
      id: `bulk-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      name,
      email,
      phone,
      category: clean(body.category, 80) || "General Wholesale",
      quantity: clean(body.quantity, 40) || "25-50 Pcs",
      businessName: clean(body.businessName, 120),
      notes: clean(body.notes, 1500),
      status: "PENDING",
      createdAt: new Date().toISOString(),
    };
    await upsertDoc(COLLECTION, inquiry);
    return NextResponse.json({ success: true, message: "Bulk order inquiry submitted successfully." });
  } catch {
    return NextResponse.json({ error: "Internal server error while saving inquiry." }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  const auth = await requireAdmin(req, "b2b");
  if (auth.error) return auth.error;

  const body = (await req.json().catch(() => ({}))) as { id?: string; status?: string; adminNotes?: string };
  if (!body.id) return NextResponse.json({ error: "Inquiry ID is required" }, { status: 400 });
  if (body.status && !STATUSES.includes(body.status as BulkOrderInquiry["status"])) return NextResponse.json({ error: "Invalid status." }, { status: 400 });

  const { found, result } = await updateDoc<BulkOrderInquiry, BulkOrderInquiry>(COLLECTION, body.id, (item) => {
    const updated = { ...item };
    if (body.status) updated.status = body.status as BulkOrderInquiry["status"];
    if (body.adminNotes !== undefined) updated.adminNotes = clean(body.adminNotes, 2000);
    return { doc: updated, result: updated };
  });
  if (!found) return NextResponse.json({ error: "Inquiry not found" }, { status: 404 });
  return NextResponse.json({ success: true, message: "Inquiry updated successfully.", inquiry: result });
}

export async function DELETE(req: NextRequest) {
  const auth = await requireAdmin(req, "b2b");
  if (auth.error) return auth.error;
  const id = new URL(req.url).searchParams.get("id");
  if (!id) return NextResponse.json({ error: "Inquiry ID is required" }, { status: 400 });
  const removed = await deleteDoc(COLLECTION, id);
  if (removed) await createAuditLog({ userId: auth.session.userId, userName: auth.session.email, userRole: auth.session.role, action: "DELETE_BULK_INQUIRY", module: "customers", recordId: id, riskLevel: "MEDIUM" });
  return NextResponse.json({ success: removed, message: removed ? "Inquiry deleted successfully." : "Inquiry not found." }, { status: removed ? 200 : 404 });
}
