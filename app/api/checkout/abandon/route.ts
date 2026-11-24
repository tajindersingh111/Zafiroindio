import { NextResponse } from "next/server";
import { z } from "zod";
import { buildCheckoutQuote } from "@/lib/checkout/quote";
import { cartItemsSchema } from "@/lib/checkout/schema";
import { buildOrderItems } from "@/lib/orders/create";
import { recordAbandonedCart } from "@/lib/checkout/abandoned";
import { CartError } from "@/lib/pricing";
import { rateLimit } from "@/lib/security/rate-limit";
import { getCustomerSession, isSameOrigin } from "@/lib/auth/customer";

export const dynamic = "force-dynamic";

const bodySchema = z.object({
  items: cartItemsSchema,
  name: z.string().trim().max(120).optional().default(""),
  phone: z.string().trim().regex(/^[6-9]\d{9}$/, "Enter a valid 10-digit mobile number."),
  email: z.union([z.email(), z.literal("")]).optional(),
  couponCode: z.string().trim().max(60).optional(),
});

/**
 * Records a cart the shopper has not paid for yet (the checkout page calls this as soon as a valid
 * mobile number is entered). Without it an abandoned cart is unrecoverable: the cart only ever
 * exists in the shopper's own browser.
 *
 * The cart is priced here rather than trusted from the browser, so the recovery value an admin sees
 * is the real one. This creates no order and holds no stock.
 *
 * Always answers 204: it is a background call on a page where the shopper is still typing, and a
 * failure here must never surface as an error in front of them.
 */
export async function POST(request: Request) {
  if (!isSameOrigin(request)) return new NextResponse(null, { status: 204 });

  const limited = await rateLimit(request, "checkout-abandon", { windowMs: 60_000, maxRequests: 12 });
  if (limited) return new NextResponse(null, { status: 204 });

  const parsed = bodySchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return new NextResponse(null, { status: 204 });
  const input = parsed.data;

  try {
    const signedIn = await getCustomerSession();
    const quote = await buildCheckoutQuote({
      items: input.items,
      couponCode: input.couponCode,
      paymentMethod: "razorpay",
      customerId: signedIn?.customer.id,
    });
    const items = buildOrderItems(quote.pricedLines, quote.productsById);

    await recordAbandonedCart({
      name: input.name,
      email: input.email || signedIn?.customer.email || "",
      phone: input.phone,
      products: items.map((i) => ({
        productId: i.productId,
        name: i.name,
        quantity: i.quantity,
        price: i.price,
        image: i.image,
      })),
      cartValue: quote.total,
      source: "checkout_form",
    });
  } catch (e) {
    // An unavailable product or a stale coupon is normal here; nothing to tell the shopper.
    if (!(e instanceof CartError)) console.error("[checkout] abandoned-cart capture failed:", e);
  }

  return new NextResponse(null, { status: 204 });
}
