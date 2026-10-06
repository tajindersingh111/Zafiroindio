import { NextRequest, NextResponse } from "next/server";
import { shiprocketCheckoutClient } from "@/lib/shiprocket-checkout/client";
import { createOrderFromCheckout, normalizeCheckoutWebhook } from "@/lib/orders/service";
import { findCheckoutSessionBySrOrder, completeCheckoutSession } from "@/lib/orders/checkout-session";
import { createAuditLog } from "@/lib/db/audit";
import { sendTransactionalEmail } from "@/lib/email/service";
import { generateInvoiceForOrder } from "@/lib/db/invoices";
import { rateLimit } from "@/lib/security/rate-limit";
import crypto from "node:crypto";

export const dynamic = "force-dynamic";

/** Order webhook from Shiprocket Checkout (fastrr). Orders are ONLY created here, after the signature is verified. */
export async function POST(request: NextRequest) {
  const limited = await rateLimit(request, "sr-webhook", { windowMs: 60_000, maxRequests: 300 });
  if (limited) return limited;

  const rawBody = await request.text();

  // Fail closed in EVERY environment: a forged webhook would create "paid" orders for free.
  if (!shiprocketCheckoutClient.verifySignature(rawBody, request.headers)) {
    return NextResponse.json({ error: "Invalid or missing webhook signature." }, { status: 401 });
  }

  let payload: Record<string, any>;
  try {
    payload = JSON.parse(rawBody);
  } catch {
    return NextResponse.json({ error: "Invalid JSON payload." }, { status: 400 });
  }

  const normalized = normalizeCheckoutWebhook(payload);
  if (!normalized) return NextResponse.json({ error: "Missing order id in payload." }, { status: 400 });

  // Deterministic id: a retry of the SAME delivery maps to the same event and is deduplicated.
  const eventId = String(payload.eventId || payload.event_id || `sr_${normalized.externalOrderId}_${normalized.eventType}_${crypto.createHash("sha256").update(rawBody).digest("hex").slice(0, 16)}`);

  try {
    const result = await createOrderFromCheckout(normalized, eventId, payload);

    if (result.status === "duplicate") return NextResponse.json({ success: true, message: "Already processed." });
    if (result.status === "ignored") return NextResponse.json({ success: true, message: `Ignored: ${result.reason}` });

    const { order } = result;

    // Link the order to the browser session that started checkout so /order-success can show it.
    const session = await findCheckoutSessionBySrOrder(normalized.externalOrderId);
    if (session) await completeCheckoutSession(session, order.id, order.orderNumber);

    await createAuditLog({
      userId: "shiprocket",
      userName: "Shiprocket Checkout",
      userRole: "system",
      action: "ORDER_CREATED_FASTRR",
      module: "orders",
      recordId: order.id,
      recordName: order.orderNumber,
      updatedData: { total: order.total, status: order.status, paymentMethod: order.paymentMethod },
      riskLevel: result.onHold ? "HIGH" : "LOW",
    });

    // Best-effort follow-ups: never fail (and re-trigger) the webhook because an email bounced.
    await generateInvoiceForOrder(order).catch((e) => console.error("Invoice generation failed:", e));
    await sendTransactionalEmail(order.paymentStatus === "paid" ? "PAYMENT_SUCCESS" : "ORDER_CREATED", order).catch((e) => console.error("Order email failed:", e));

    return NextResponse.json({ success: true, orderNumber: order.orderNumber });
  } catch (error) {
    // 5xx => Shiprocket retries. The old code swallowed this and answered 200, silently losing paid orders.
    console.error("Shiprocket checkout webhook failed:", error);
    return NextResponse.json({ error: "Order could not be stored. Please retry." }, { status: 500 });
  }
}
