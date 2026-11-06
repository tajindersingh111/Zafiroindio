import { NextResponse } from "next/server";
import { z } from "zod";
import { buildCheckoutQuote } from "@/lib/checkout/quote";
import { addressSchema, cartItemsSchema, paymentMethodSchema, toAddress } from "@/lib/checkout/schema";
import { buildOrderItems, createDirectOrder } from "@/lib/orders/create";
import { createPaymentSession, newCheckoutRef } from "@/lib/checkout/session";
import { CartError } from "@/lib/pricing";
import { rateLimit } from "@/lib/security/rate-limit";
import { getCustomerSession, isSameOrigin } from "@/lib/auth/customer";
import { normalizeEmail, normalizePhone } from "@/lib/orders/contact";
import {
  createRazorpayOrder,
  getPublicRazorpayKeyId,
  isRazorpayConfigured,
  RazorpayApiError,
  RazorpayConfigError,
} from "@/lib/payments/razorpay";

export const dynamic = "force-dynamic";

const bodySchema = z.object({
  items: cartItemsSchema,
  shipping: addressSchema,
  /** Omit to bill to the shipping address. */
  billing: addressSchema.optional(),
  couponCode: z.string().trim().max(60).optional(),
  paymentMethod: paymentMethodSchema,
  source: z.enum(["cart", "buy-now"]).optional().default("cart"),
});

/**
 * Starts a checkout.
 *
 * COD places the order straight away. Online payment does **not** create an order: it freezes the
 * priced cart in a payment session and returns a Razorpay order for the browser to pay, exactly as
 * the Shiprocket flow did (no order exists until the money is confirmed), so an abandoned payment
 * leaves no phantom order and no stock held.
 */
export async function POST(request: Request) {
  if (!isSameOrigin(request)) return NextResponse.json({ error: "Cross-site request blocked." }, { status: 403 });

  const limited = await rateLimit(request, "checkout-create", { windowMs: 60_000, maxRequests: 20 });
  if (limited) return limited;

  const parsed = bodySchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message || "Please check your details." }, { status: 400 });
  }
  const input = parsed.data;

  const signedIn = await getCustomerSession();
  const shipping = toAddress(input.shipping);
  const billing = input.billing ? toAddress(input.billing) : shipping;

  try {
    const quote = await buildCheckoutQuote({
      items: input.items,
      couponCode: input.couponCode,
      paymentMethod: input.paymentMethod,
      customerId: signedIn?.customer.id,
    });

    // A coupon that stopped being valid between the quote and here must not be silently dropped:
    // the shopper agreed to a total that included it.
    if (input.couponCode?.trim() && quote.couponError) {
      return NextResponse.json({ error: quote.couponError }, { status: 409 });
    }
    // The shopper asked for COD but the cart does not allow it.
    if (input.paymentMethod === "cod" && !quote.codAvailable) {
      return NextResponse.json({ error: quote.codUnavailableReason || "Cash on Delivery is not available for this order." }, { status: 409 });
    }

    const items = buildOrderItems(quote.pricedLines, quote.productsById);
    const snapshot = {
      items,
      subtotal: quote.subtotal,
      discount: quote.discount,
      couponCode: quote.coupon?.code,
      couponId: quote.coupon?.id,
      shippingCost: quote.shippingCost,
      codFee: quote.codFee,
      tax: quote.tax,
      total: quote.total,
      paymentMethod: input.paymentMethod === "cod" ? ("cod" as const) : ("razorpay" as const),
    };

    const name = [shipping.firstName, shipping.lastName].filter(Boolean).join(" ").trim() || "Valued Customer";
    const customer = {
      name,
      email: normalizeEmail(shipping.email || signedIn?.customer.email || ""),
      phone: normalizePhone(shipping.phone || signedIn?.customer.phone || ""),
      customerId: signedIn?.customer.id,
    };

    const ref = newCheckoutRef();

    // ── Cash on delivery: the order is placed now ───────────
    if (input.paymentMethod === "cod") {
      const result = await createDirectOrder({
        paymentKey: `cod_${ref}`,
        snapshot,
        customer,
        shipping,
        billing,
        paymentMethod: "cod",
        paymentStatus: "pending",
      });
      const order = result.status === "created" ? result.order : result.order;
      if (!order) return NextResponse.json({ error: "We could not place your order. Please try again." }, { status: 500 });

      await createPaymentSession({
        id: ref,
        status: "completed",
        orderId: order.id,
        orderNumber: order.orderNumber,
        customerId: order.customerId,
        customer: { name: customer.name, email: customer.email, phone: customer.phone },
        shipping,
        billing,
        snapshot,
        source: input.source,
      });

      return NextResponse.json({
        mode: "cod",
        ref,
        orderNumber: order.orderNumber,
        total: order.total,
        redirectTo: `/order-success?ref=${ref}`,
      });
    }

    // ── Online payment: freeze the cart, hand the browser a Razorpay order ───────────
    if (!isRazorpayConfigured()) {
      return NextResponse.json({ error: "Online payment is unavailable right now. Please choose Cash on Delivery." }, { status: 503 });
    }

    const rzpOrder = await createRazorpayOrder({
      amountRupees: quote.total,
      receipt: ref.slice(0, 40),
      notes: { ref, phone: customer.phone, items: String(items.length) },
    });

    await createPaymentSession({
      id: ref,
      status: "pending",
      razorpayOrderId: rzpOrder.id,
      customerId: signedIn?.customer.id,
      customer: { name: customer.name, email: customer.email, phone: customer.phone },
      shipping,
      billing,
      snapshot,
      source: input.source,
    });

    return NextResponse.json({
      mode: "razorpay",
      ref,
      keyId: getPublicRazorpayKeyId(),
      razorpayOrderId: rzpOrder.id,
      amount: rzpOrder.amount, // paise, as Razorpay Checkout expects
      currency: rzpOrder.currency,
      total: quote.total,
      prefill: { name: customer.name, email: customer.email, contact: customer.phone },
    });
  } catch (e) {
    if (e instanceof CartError) return NextResponse.json({ error: e.message }, { status: e.status });
    if (e instanceof RazorpayConfigError) {
      console.error("[checkout]", e.message);
      return NextResponse.json({ error: "Online payment is unavailable right now. Please choose Cash on Delivery." }, { status: 503 });
    }
    if (e instanceof RazorpayApiError) {
      console.error("[checkout] Razorpay order failed:", e.message, e.status);
      return NextResponse.json({ error: "The payment provider could not start this payment. Please try again." }, { status: 502 });
    }
    console.error("[checkout] create failed:", e);
    return NextResponse.json({ error: "We could not start your checkout. Please try again." }, { status: 500 });
  }
}
