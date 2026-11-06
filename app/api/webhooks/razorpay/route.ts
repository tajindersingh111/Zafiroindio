import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db/prisma";
import { findPaymentSessionByRazorpayOrder, updatePaymentSession } from "@/lib/checkout/session";
import { confirmRazorpayPayment } from "@/lib/checkout/confirm";
import { verifyWebhookSignature, isWebhookConfigured, type RazorpayPayment } from "@/lib/payments/razorpay";
import { rateLimit } from "@/lib/security/rate-limit";

export const dynamic = "force-dynamic";

/**
 * Razorpay webhook — the confirmation path that does not depend on the shopper's browser.
 *
 * If someone pays and immediately closes the tab, this is what still turns the payment into an
 * order. It is signed (HMAC-SHA256 of the raw body with RAZORPAY_WEBHOOK_SECRET), and an unsigned
 * or wrongly signed call is rejected outright — unlike the Shiprocket webhook, which had to treat
 * unsigned calls as hints, Razorpay always signs, so there is no reason to be lenient.
 *
 * Register it in the Razorpay dashboard for `payment.captured` and `payment.failed`:
 *   https://<domain>/api/webhooks/razorpay
 */
export async function POST(request: Request) {
  // Generous but finite: Razorpay retries, and this must not be a free DoS amplifier.
  const limited = await rateLimit(request, "razorpay-webhook", { windowMs: 60_000, maxRequests: 240, store: "memory" });
  if (limited) return limited;

  if (!isWebhookConfigured()) {
    console.error("[razorpay] webhook received but RAZORPAY_WEBHOOK_SECRET is not set");
    return NextResponse.json({ error: "Webhook not configured." }, { status: 503 });
  }

  // The signature covers the exact bytes sent, so read the body as text and never re-serialise it.
  const rawBody = await request.text();
  const signature = request.headers.get("x-razorpay-signature");

  if (!verifyWebhookSignature(rawBody, signature)) {
    console.error("[razorpay] webhook signature rejected");
    return NextResponse.json({ error: "Invalid signature." }, { status: 401 });
  }

  let payload: any;
  try {
    payload = JSON.parse(rawBody);
  } catch {
    return NextResponse.json({ error: "Invalid JSON." }, { status: 400 });
  }

  const event = String(payload?.event || "");
  const payment: RazorpayPayment | undefined = payload?.payload?.payment?.entity;

  if (!payment?.id || !payment.order_id) {
    // Not an event we act on (refund, settlement, subscription...). Acknowledge so Razorpay stops retrying.
    return NextResponse.json({ received: true, ignored: `no payment entity on ${event || "event"}` });
  }

  // Idempotency: the unique eventId means a retried delivery does no work twice.
  const eventId = `rzp_${event}_${payment.id}`;
  try {
    await prisma.webhookEvent.create({
      data: { eventId, provider: "razorpay", eventType: event || "unknown", payload: payload as Prisma.InputJsonValue, status: "processed" },
    });
  } catch (e) {
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002") {
      return NextResponse.json({ received: true, duplicate: true });
    }
    throw e;
  }

  const session = await findPaymentSessionByRazorpayOrder(payment.order_id);
  if (!session) {
    // A payment we have no checkout for: log loudly (it needs a human) but acknowledge.
    console.error(`[razorpay] no checkout session for order ${payment.order_id} (payment ${payment.id})`);
    return NextResponse.json({ received: true, ignored: "unknown checkout" });
  }

  if (event === "payment.failed") {
    if (session.status === "pending") await updatePaymentSession(session, { status: "failed", razorpayPaymentId: payment.id });
    return NextResponse.json({ received: true, outcome: "failed" });
  }

  const result = await confirmRazorpayPayment(session, payment.id, "webhook", payment);
  return NextResponse.json({
    received: true,
    outcome: result.status,
    ...(result.status === "confirmed" ? { orderNumber: result.order.orderNumber, created: result.created } : {}),
  });
}
