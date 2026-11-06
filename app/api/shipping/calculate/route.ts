import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db/prisma";
import { readSettings } from "@/lib/db/store";
import { calculateShippingAndCodFee } from "@/lib/shipping/calculator";
import { rateLimit } from "@/lib/security/rate-limit";
import type { Product, StoreSettings } from "@/lib/db/types";

export const dynamic = "force-dynamic";

const bodySchema = z.object({
  items: z
    .array(
      z.object({
        productId: z.string().min(1).max(200),
        quantity: z.number().int().min(1).max(100),
        price: z.number().min(0).max(10_000_000).optional().default(0),
      })
    )
    .min(1, "Cart items are required for shipping calculation.")
    .max(50),
  paymentMethod: z.string().max(40).optional().default("cod"),
});

/**
 * Shipping / COD rules for a cart.
 *
 * Previously this was unauthenticated, unlimited **and** loaded the entire product catalogue on
 * every call — a cheap way to hammer the database. It now loads only the products in the posted
 * cart (the same `id = ANY(...)` pattern as lib/pricing.ts) and is rate limited.
 *
 * Note: this reports the shipping *rules* only. The authoritative amount a shopper pays comes from
 * /api/checkout/quote, which prices the cart from the database.
 */
export async function POST(request: Request) {
  const limited = await rateLimit(request, "shipping-calculate", { windowMs: 60_000, maxRequests: 60 });
  if (limited) return limited;

  const parsed = bodySchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message || "Invalid cart." }, { status: 400 });
  }
  const { items, paymentMethod } = parsed.data;

  try {
    const keys = Array.from(new Set(items.map((i) => String(i.productId))));
    const [rows, storeSettings] = await Promise.all([
      prisma.$queryRaw<{ data: Product }[]>`
        SELECT data FROM documents
        WHERE collection = 'products' AND (id = ANY(${keys}::text[]) OR data->>'slug' = ANY(${keys}::text[]))`,
      readSettings<StoreSettings>("settings").catch(() => null),
    ]);

    const productsMap = new Map<string, Product>();
    for (const { data: p } of rows) {
      productsMap.set(p.id, p);
      productsMap.set(p.slug, p);
    }

    const result = calculateShippingAndCodFee({
      items,
      productsMap,
      paymentMethod,
      storeSettings: storeSettings ?? undefined,
    });

    return NextResponse.json({ result });
  } catch (err) {
    console.error("Error calculating shipping and COD fee:", err);
    return NextResponse.json({ error: "Failed to evaluate shipping rules." }, { status: 500 });
  }
}
