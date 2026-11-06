import { NextResponse } from "next/server";
import { z } from "zod";
import { buildCheckoutQuote, publicQuote } from "@/lib/checkout/quote";
import { cartItemsSchema, paymentMethodSchema } from "@/lib/checkout/schema";
import { CartError } from "@/lib/pricing";
import { rateLimit } from "@/lib/security/rate-limit";
import { getCustomerSession } from "@/lib/auth/customer";
import { isRazorpayConfigured } from "@/lib/payments/razorpay";

export const dynamic = "force-dynamic";

const bodySchema = z.object({
  items: cartItemsSchema,
  couponCode: z.string().trim().max(60).optional(),
  paymentMethod: paymentMethodSchema.optional().default("razorpay"),
});

/**
 * Prices the cart for the checkout page: line prices, coupon, shipping, COD fee and total — all
 * computed server-side from the database. The browser renders this; it never calculates a total.
 */
export async function POST(request: Request) {
  const limited = await rateLimit(request, "checkout-quote", { windowMs: 60_000, maxRequests: 60 });
  if (limited) return limited;

  const parsed = bodySchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message || "Invalid cart." }, { status: 400 });
  }

  const signedIn = await getCustomerSession();

  try {
    const quote = await buildCheckoutQuote({
      items: parsed.data.items,
      couponCode: parsed.data.couponCode,
      paymentMethod: parsed.data.paymentMethod,
      customerId: signedIn?.customer.id,
    });
    return NextResponse.json({
      quote: publicQuote(quote),
      onlinePaymentAvailable: isRazorpayConfigured(),
    });
  } catch (e) {
    if (e instanceof CartError) return NextResponse.json({ error: e.message }, { status: e.status });
    console.error("[checkout] quote failed:", e);
    return NextResponse.json({ error: "We could not price your cart right now. Please try again." }, { status: 500 });
  }
}
