import { NextResponse } from "next/server";
import { z } from "zod";
import { getPaymentSession, updatePaymentSession } from "@/lib/checkout/session";
import { confirmRazorpayPayment } from "@/lib/checkout/confirm";
import { verifyPaymentSignature } from "@/lib/payments/razorpay";
import { rateLimit } from "@/lib/security/rate-limit";
import { isSameOrigin } from "@/lib/auth/customer";

export const dynamic = "force-dynamic";

const bodySchema = z.object({
  ref: z.string().regex(/^[a-f0-9]{48}$/, "Invalid checkout reference."),
  razorpayOrderId: z.string().min(4).max(80),
  razorpayPaymentId: z.string().min(4).max(80),
  signature: z.string().min(16).max(256),
});

/**
 * The browser hands back what Razorpay Checkout returned. Two gates before anything is stored:
 * the HMAC signature must verify (proves the values came from Razorpay), and the payment is then
 * read back from Razorpay's API (proves the money actually arrived).
 *
 * A forged call therefore cannot create an order, and this endpoint is only a convenience — the
 * webhook confirms the same payment independently if the shopper closes the tab.
 */
export async function POST(request: Request) {
  if (!isSameOrigin(request)) return NextResponse.json({ error: "Cross-site request blocked." }, { status: 403 });

  const limited = await rateLimit(request, "checkout-verify", { windowMs: 60_000, maxRequests: 30 });
  if (limited) return limited;

  const parsed = bodySchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Invalid payment confirmation." }, { status: 400 });
  const { ref, razorpayOrderId, razorpayPaymentId, signature } = parsed.data;

  const session = await getPaymentSession(ref);
  if (!session) return NextResponse.json({ error: "This checkout has expired. Please try again." }, { status: 404 });
  if (session.razorpayOrderId && session.razorpayOrderId !== razorpayOrderId) {
    return NextResponse.json({ error: "This payment does not belong to this checkout." }, { status: 409 });
  }

  if (!verifyPaymentSignature({ razorpayOrderId, razorpayPaymentId, signature })) {
    console.error(`[checkout] bad payment signature for ref ${ref}`);
    return NextResponse.json({ error: "We could not verify this payment. Please contact us before paying again." }, { status: 400 });
  }

  const result = await confirmRazorpayPayment(session, razorpayPaymentId, "handshake");

  if (result.status === "confirmed") {
    return NextResponse.json({
      success: true,
      orderNumber: result.order.orderNumber,
      redirectTo: `/order-success?ref=${ref}`,
    });
  }
  if (result.status === "failed") {
    return NextResponse.json({ error: result.reason }, { status: 402 });
  }
  // Pending: the webhook will finish it. Send the shopper to the confirmation page, which polls.
  return NextResponse.json({ success: true, pending: true, redirectTo: `/order-success?ref=${ref}` });
}

/** Shopper dismissed the Razorpay window: record it so the session isn't left dangling. */
export async function PATCH(request: Request) {
  if (!isSameOrigin(request)) return NextResponse.json({ error: "Cross-site request blocked." }, { status: 403 });

  const parsed = z.object({ ref: z.string().regex(/^[a-f0-9]{48}$/) }).safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Invalid request." }, { status: 400 });

  const session = await getPaymentSession(parsed.data.ref);
  // Only ever abandons a still-pending session — never one that has already been paid.
  if (session && session.status === "pending") await updatePaymentSession(session, { status: "failed" });
  return NextResponse.json({ success: true });
}
