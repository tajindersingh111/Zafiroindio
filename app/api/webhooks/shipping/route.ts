import crypto from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { findOneByField } from "@/lib/db/store";
import { syncOrderTracking } from "@/lib/shipping/provider";
import { rateLimit } from "@/lib/security/rate-limit";
import type { Order } from "@/lib/db/types";

export const dynamic = "force-dynamic";

function tokenOk(request: NextRequest): boolean {
  const secret = process.env.SHIPMOZO_WEBHOOK_SECRET;
  if (!secret) return false; // fail closed
  const given = request.nextUrl.searchParams.get("token") || request.headers.get("x-webhook-token") || (request.headers.get("authorization") || "").replace(/^Bearer\s+/i, "");
  const a = Buffer.from(given);
  const b = Buffer.from(secret);
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}

function pick(obj: unknown, keys: string[], depth = 0): string | undefined {
  if (!obj || typeof obj !== "object" || depth > 3) return undefined;
  for (const k of keys) {
    const v = (obj as Record<string, unknown>)[k];
    if ((typeof v === "string" || typeof v === "number") && String(v).trim()) return String(v).trim();
  }
  for (const v of Object.values(obj)) {
    const hit = pick(v, keys, depth + 1);
    if (hit) return hit;
  }
  return undefined;
}

/**
 * ShipMozo status webhook: https://<domain>/api/webhooks/shipping?token=<SHIPMOZO_WEBHOOK_SECRET>
 *
 * The payload is only a hint. We read the AWB / order number from it and pull the real status from
 * ShipMozo's tracking API with our own keys, so a forged call can at most trigger a refresh.
 */
export async function POST(request: NextRequest) {
  const limited = await rateLimit(request, "shipmozo-webhook", { windowMs: 60_000, maxRequests: 600 });
  if (limited) return limited;
  if (!tokenOk(request)) return NextResponse.json({ error: "Invalid webhook token." }, { status: 401 });

  const raw = await request.text();
  let payload: unknown = null;
  try {
    payload = JSON.parse(raw);
  } catch {
    payload = Object.fromEntries(new URLSearchParams(raw)); // form-encoded deliveries
  }

  const awb = pick(payload, ["awb_number", "awb", "awb_code", "tracking_number"]);
  const ref = pick(payload, ["order_id", "channel_order_id", "order_number", "orderNumber"]);
  const order =
    (awb ? await findOneByField<Order>("orders", "trackingNumber", awb) : null) ??
    (ref ? await findOneByField<Order>("orders", "orderNumber", ref) : null);
  // 200 for unknown orders: ShipMozo also reports shipments created outside this shop.
  if (!order) return NextResponse.json({ success: true, found: false });

  const r = await syncOrderTracking(order);
  if (!r.ok) {
    console.error(`[shipmozo-webhook] sync ${order.orderNumber} failed:`, r.error);
    return NextResponse.json({ error: "Could not refresh tracking. Please retry." }, { status: 502 });
  }
  return NextResponse.json({ success: true, found: true, status: r.status, courierStatus: r.courierStatus });
}
