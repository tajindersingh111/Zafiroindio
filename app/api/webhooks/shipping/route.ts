import { NextRequest, NextResponse } from "next/server";
import crypto from "node:crypto";
import { prisma } from "@/lib/db/prisma";
import { Prisma } from "@prisma/client";
import { applyShipmentEvent } from "@/lib/orders/service";
import { shiprocketCheckoutClient } from "@/lib/shiprocket-checkout/client";
import { verifyShiprocketTrackingWebhook } from "@/lib/shipping/shiprocket";
import { rateLimit } from "@/lib/security/rate-limit";

export const dynamic = "force-dynamic";

/** Courier tracking updates from Shiprocket. Always authenticated, idempotent and forward-only. */
export async function POST(request: NextRequest) {
  const limited = await rateLimit(request, "sr-tracking-webhook", { windowMs: 60_000, maxRequests: 600 });
  if (limited) return limited;

  const rawBody = await request.text();
  const signature = request.headers.get("x-shiprocket-signature") || request.headers.get("x-fastrr-signature") || request.headers.get("x-api-hmac-sha256");

  // Fail closed: previously this check was skipped entirely when the secret env var was unset.
  const valid = verifyShiprocketTrackingWebhook(rawBody, signature) || shiprocketCheckoutClient.verifySignature(rawBody, request.headers);
  if (!valid) return NextResponse.json({ error: "Invalid tracking webhook signature." }, { status: 401 });

  let payload: Record<string, any>;
  try {
    payload = JSON.parse(rawBody);
  } catch {
    return NextResponse.json({ error: "Invalid JSON payload." }, { status: 400 });
  }

  const orderRef = String(payload.order_id || payload.orderNumber || payload.channel_order_id || "").trim();
  const awb = payload.awb || payload.awb_code ? String(payload.awb || payload.awb_code) : undefined;
  const statusText = String(payload.current_status || payload.status || payload.shipment_status || "");
  if (!orderRef && !awb) return NextResponse.json({ error: "Missing order_id or awb." }, { status: 400 });

  // Deterministic event id (the old one embedded Date.now(), so retries were never deduplicated).
  const eventId = String(payload.event_id || payload.scans?.[0]?.scan_id || `trk_${orderRef || awb}_${statusText}_${crypto.createHash("sha256").update(rawBody).digest("hex").slice(0, 12)}`);

  try {
    await prisma.webhookEvent.create({ data: { eventId, provider: "shiprocket_tracking", eventType: statusText || "unknown", payload: payload as Prisma.InputJsonValue } });
  } catch (e) {
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002") {
      return NextResponse.json({ success: true, message: "Duplicate webhook event ignored." });
    }
    throw e;
  }

  try {
    const result = await applyShipmentEvent(orderRef || String(awb), {
      statusText,
      awb,
      courier: payload.courier_name || payload.courier,
      trackingUrl: payload.tracking_url || payload.track_url,
    });
    return NextResponse.json({ success: true, found: result.found, applied: result.applied, status: result.status });
  } catch (error) {
    console.error("Shiprocket tracking webhook error:", error);
    // allow the provider to retry: forget the idempotency marker
    await prisma.webhookEvent.delete({ where: { eventId } }).catch(() => {});
    return NextResponse.json({ error: "Webhook processing error" }, { status: 500 });
  }
}
