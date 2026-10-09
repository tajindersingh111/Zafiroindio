import crypto from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { shiprocketCheckoutClient, ShiprocketConfigError } from "@/lib/shiprocket-checkout/client";
import { normalizeCheckoutWebhook } from "@/lib/orders/service";
import { confirmByLookup, confirmShiprocketOrder, type ConfirmResult } from "@/lib/orders/confirm";
import { rateLimit } from "@/lib/security/rate-limit";

export const dynamic = "force-dynamic";

/**
 * Order webhook from Shiprocket Checkout (fastrr).
 *
 * A correctly signed body is used as-is. Anything else (no signature, or a signing scheme we don't
 * recognise) is treated only as a hint: we take the order id and fetch the order from Shiprocket's
 * API with our own credentials, so a forged call can never create an order that isn't real and paid.
 */
export async function POST(request: NextRequest) {
  const limited = await rateLimit(request, "sr-webhook", { windowMs: 60_000, maxRequests: 300, store: "memory" });
  if (limited) return limited;

  const rawBody = await request.text();
  let payload: Record<string, any>;
  try {
    payload = JSON.parse(rawBody);
  } catch {
    return NextResponse.json({ error: "Invalid JSON payload." }, { status: 400 });
  }

  const hinted = normalizeCheckoutWebhook(payload);
  if (!hinted) return NextResponse.json({ error: "Missing order id in payload." }, { status: 400 });

  try {
    let result: ConfirmResult;
    if (shiprocketCheckoutClient.verifySignature(rawBody, request.headers)) {
      // Deterministic id: a retry of the SAME delivery maps to the same event and is deduplicated.
      const eventId = String(payload.eventId || payload.event_id || `sr_${hinted.externalOrderId}_${hinted.eventType}_${crypto.createHash("sha256").update(rawBody).digest("hex").slice(0, 16)}`);
      result = await confirmShiprocketOrder(hinted, eventId, payload, "webhook");
      // A signed event without a clear paid/COD status: ask Shiprocket for the final state.
      if (result.status === "pending") result = await confirmByLookup(hinted.externalOrderId, "webhook");
    } else {
      const unsigned = await rateLimit(request, "sr-webhook-unsigned", { windowMs: 60_000, maxRequests: 60 });
      if (unsigned) return unsigned;
      result = await confirmByLookup(hinted.externalOrderId, "webhook");
    }

    if (result.status === "confirmed") return NextResponse.json({ success: true, orderNumber: result.order.orderNumber, created: result.created });
    return NextResponse.json({ success: true, message: result.status === "failed" ? "Ignored: payment failed." : `Not stored: ${result.reason}` });
  } catch (error) {
    if (error instanceof ShiprocketConfigError) {
      console.error(error.message);
      return NextResponse.json({ error: "Checkout is not configured." }, { status: 503 });
    }
    // 5xx => Shiprocket retries, so a paid order is never silently lost.
    console.error("Shiprocket checkout webhook failed:", error);
    return NextResponse.json({ error: "Order could not be stored. Please retry." }, { status: 500 });
  }
}

