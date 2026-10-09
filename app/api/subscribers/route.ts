import crypto from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { getDoc, upsertDoc } from "@/lib/db/store";
import { rateLimit } from "@/lib/security/rate-limit";

export const dynamic = "force-dynamic";

export interface Subscriber {
  id: string;
  email: string;
  name?: string;
  phone?: string;
  source?: string;
  subscribedAt: string;
}

const EMAIL_RE = /^[^\s@]{1,64}@[^\s@]{1,255}\.[^\s@]{2,}$/;

export async function POST(req: NextRequest) {
  const limited = await rateLimit(req, "subscribe", { windowMs: 10 * 60_000, maxRequests: 6 });
  if (limited) return limited;

  try {
    const { email, name, phone, source } = (await req.json()) as { email?: unknown; name?: unknown; phone?: unknown; source?: unknown };
    const cleanEmail = String(email || "").trim().toLowerCase();
    if (!EMAIL_RE.test(cleanEmail) || cleanEmail.length > 254) {
      return NextResponse.json({ error: "Please enter a valid email address." }, { status: 400 });
    }
    const cleanName = typeof name === "string" ? name.trim().slice(0, 100) || undefined : undefined;
    const digits = typeof phone === "string" ? phone.replace(/\D/g, "").slice(-10) : "";
    const cleanPhone = /^[6-9]\d{9}$/.test(digits) ? digits : undefined;
    const cleanSource = typeof source === "string" ? source.slice(0, 40) : undefined;

    // Deterministic id => the same address can never be stored twice, even under concurrent requests.
    const id = `sub_${crypto.createHash("sha256").update(cleanEmail).digest("hex").slice(0, 24)}`;
    const existing = await getDoc<Subscriber>("subscribers", id);
    if (existing) {
      if ((cleanName && !existing.name) || (cleanPhone && !existing.phone)) {
        await upsertDoc("subscribers", { ...existing, name: existing.name ?? cleanName, phone: existing.phone ?? cleanPhone });
      }
      return NextResponse.json({ success: true, message: "You are already subscribed to Zafiro Indio newsletters!" });
    }
    await upsertDoc("subscribers", { id, email: cleanEmail, name: cleanName, phone: cleanPhone, source: cleanSource, subscribedAt: new Date().toISOString() } satisfies Subscriber);

    return NextResponse.json({ success: true, message: "Thank you for subscribing! Use code WELCOME10 at checkout for 10% off your first order." });
  } catch {
    return NextResponse.json({ error: "Failed to process subscription." }, { status: 500 });
  }
}
