import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { calculateTrustedCartPricing } from "@/lib/pricing";
import { shiprocketCheckoutClient } from "@/lib/shiprocket-checkout/client";
import { checkRateLimit } from "@/lib/rate-limiter";

const tokenRequestSchema = z.object({
  items: z.array(
    z.object({
      productId: z.string().min(1, "productId is required"),
      qty: z.number().int().min(1, "qty must be at least 1"),
      size: z.string().optional(),
      color: z.string().optional()
    })
  ).min(1, "Cart must contain at least 1 item"),
  couponCode: z.string().optional()
});

export async function POST(request: NextRequest) {
  try {
    const ip = request.headers.get("x-forwarded-for")?.split(",")[0] || "127.0.0.1";
    const rateLimit = await checkRateLimit(`checkout-token:${ip}`, { windowMs: 60000, limit: 15 });
    if (!rateLimit.success) {
      return NextResponse.json(
        { error: "Too many requests. Please try again later." },
        { status: 429, headers: { "Retry-After": "60" } }
      );
    }

    const rawBody = await request.json();
    const parseResult = tokenRequestSchema.safeParse(rawBody);

    if (!parseResult.success) {
      return NextResponse.json(
        { error: "Invalid request payload", details: parseResult.error.format() },
        { status: 400 }
      );
    }

    const { items, couponCode } = parseResult.data;

    // 1. Calculate trusted pricing on the server from DB product prices
    const pricing = await calculateTrustedCartPricing(items, couponCode);

    // 2. Generate Shiprocket Checkout token via adapter
    const checkoutResponse = await shiprocketCheckoutClient.generateCheckoutToken({
      items: pricing.items,
      subtotal: pricing.subtotal,
      discount: pricing.discount,
      shippingFee: pricing.shippingFee,
      tax: pricing.tax,
      total: pricing.total,
      couponCode: pricing.couponCode
    });

    if (!checkoutResponse.success) {
      return NextResponse.json(
        { error: checkoutResponse.error || "Failed to initialize Shiprocket Checkout session" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      token: checkoutResponse.token,
      appId: checkoutResponse.appId,
      checkoutUrl: checkoutResponse.checkoutUrl,
      pricing: {
        subtotal: pricing.subtotal,
        discount: pricing.discount,
        shippingFee: pricing.shippingFee,
        total: pricing.total,
        couponCode: pricing.couponCode
      }
    });
  } catch (error: any) {
    console.error("Shiprocket token generation error:", error);
    return NextResponse.json(
      { error: error?.message || "Internal server error generating checkout token." },
      { status: 500 }
    );
  }
}
