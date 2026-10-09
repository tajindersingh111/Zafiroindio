import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { CartError, priceCart } from "@/lib/pricing";
import { shiprocketCheckoutClient, ShiprocketApiError, ShiprocketConfigError } from "@/lib/shiprocket-checkout/client";
import { rateLimit } from "@/lib/security/rate-limit";
import { createCheckoutSession, linkShiprocketOrder, newCheckoutRef } from "@/lib/orders/checkout-session";

export const dynamic = "force-dynamic";

const bodySchema = z.object({
  items: z
    .array(
      z.object({
        productId: z.string().min(1).max(200),
        qty: z.number().int().min(1).max(20),
        size: z.string().max(60).optional(),
        color: z.string().max(60).optional(),
      })
    )
    .min(1)
    .max(40),
});

function siteOrigin(request: NextRequest): string {
  const configured = process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, "");
  if (configured) return configured;
  const host = request.headers.get("x-forwarded-host") || request.headers.get("host");
  const proto = request.headers.get("x-forwarded-proto") || (process.env.NODE_ENV === "production" ? "https" : "http");
  return `${proto}://${host}`;
}

/** Start a Shiprocket Checkout session for the cart. Prices come from our database, never the browser. */
export async function POST(request: NextRequest) {
  const limited = await rateLimit(request, "checkout-token", { windowMs: 60_000, maxRequests: 60 });
  if (limited) return limited;

  const parsed = bodySchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Invalid cart." }, { status: 400 });

  try {
    const priced = await priceCart(parsed.data.items);
    const ref = newCheckoutRef();
    await createCheckoutSession(ref, priced.items.map((l) => ({ productId: l.productId, variationId: l.variationId, variantId: l.variantId, quantity: l.quantity })));

    const redirectUrl = `${siteOrigin(request)}/order-success?ref=${ref}`;
    const result = await shiprocketCheckoutClient.createCheckoutToken(
      priced.items.map((l) => ({ variantId: l.variantId, quantity: l.quantity })),
      redirectUrl
    );
    if (result.orderId) await linkShiprocketOrder(ref, result.orderId);

    return NextResponse.json({
      success: true,
      token: result.token,
      expiresAt: result.expiresAt,
      ref,
      subtotal: priced.subtotal,
      fallbackUrl: `${siteOrigin(request)}/cart`,
    });
  } catch (error) {
    if (error instanceof CartError) return NextResponse.json({ error: error.message }, { status: error.status });
    if (error instanceof ShiprocketConfigError) {
      console.error(error.message);
      return NextResponse.json({ error: "Checkout is temporarily unavailable. Please try again shortly." }, { status: 503 });
    }
    if (error instanceof ShiprocketApiError) return NextResponse.json({ error: "We could not start secure checkout. Please try again." }, { status: 502 });
    console.error("Checkout token error:", error);
    return NextResponse.json({ error: "Something went wrong. Please try again." }, { status: 500 });
  }
}
