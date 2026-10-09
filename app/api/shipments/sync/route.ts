import crypto from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth/guard";
import { syncActiveShipments, syncOrderTracking } from "@/lib/shipping/provider";

export const dynamic = "force-dynamic";
export const maxDuration = 300;

function cronAuthorized(request: NextRequest): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false;
  const given = (request.headers.get("authorization") || "").replace(/^Bearer\s+/i, "") || request.headers.get("x-cron-secret") || "";
  const a = Buffer.from(given);
  const b = Buffer.from(secret);
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}

/**
 * Pull courier status from ShipMozo.
 * - Cron (every 30-60 min, `Authorization: Bearer <CRON_SECRET>`): all booked, undelivered orders.
 * - Admin with {orderId}: just that order ("Refresh tracking" button).
 */
export async function POST(request: NextRequest) {
  const body = (await request.json().catch(() => ({}))) as { orderId?: unknown };
  const orderId = typeof body.orderId === "string" ? body.orderId : "";

  if (!cronAuthorized(request)) {
    const auth = await requireAdmin(request, "orders");
    if (auth.error) return auth.error;
    if (!orderId) return NextResponse.json({ error: "orderId is required." }, { status: 400 });
  }

  if (orderId) {
    const r = await syncOrderTracking(orderId);
    return NextResponse.json(r, { status: r.ok ? 200 : 502 });
  }
  return NextResponse.json(await syncActiveShipments());
}
