import { prisma } from "@/lib/db/prisma";
import { mutateCollection } from "@/lib/db/store";
import type { Coupon, Product } from "@/lib/db/types";
import type { PricedLine } from "@/lib/pricing";

/**
 * Coupon validation and redemption for our own checkout.
 *
 * Coupons live in Admin → Coupons but nothing applied them while checkout was hosted elsewhere;
 * this is where they finally take effect. The discount is always recomputed on the server from the
 * database — a code and a cart is all the browser ever sends.
 */

export type CouponFailure =
  | "not_found"
  | "inactive"
  | "not_started"
  | "expired"
  | "usage_limit"
  | "below_minimum"
  | "above_maximum"
  | "no_eligible_items";

export type CouponResult =
  | { ok: true; coupon: Coupon; discount: number; eligibleSubtotal: number }
  | { ok: false; reason: CouponFailure; message: string };

const round2 = (n: number) => Math.round(n * 100) / 100;

function normalizeCode(raw: unknown): string {
  return String(raw ?? "").trim().toUpperCase();
}

async function findCouponByCode(code: string): Promise<Coupon | null> {
  // Codes are stored as typed by the admin; compare case-insensitively.
  const rows = await prisma.$queryRaw<{ data: Coupon }[]>`
    SELECT data FROM documents
    WHERE collection = 'coupons' AND upper(data->>'code') = ${code}
    LIMIT 1`;
  return rows[0]?.data ?? null;
}

/**
 * Validates a code against this cart and returns the discount in rupees.
 *
 * `productsById` is only needed for coupons restricted to particular products or categories; pass
 * what priceCart already loaded rather than the whole catalogue.
 */
export async function validateCoupon(params: {
  code: string;
  lines: PricedLine[];
  productsById?: Map<string, Product>;
  /** Used for the per-customer usage limit; omit for guests. */
  customerId?: string;
}): Promise<CouponResult> {
  const code = normalizeCode(params.code);
  if (!code) return { ok: false, reason: "not_found", message: "Enter a coupon code." };

  const coupon = await findCouponByCode(code);
  if (!coupon) return { ok: false, reason: "not_found", message: "That coupon code is not valid." };
  if (coupon.isActive === false) return { ok: false, reason: "inactive", message: "That coupon is no longer active." };

  const now = Date.now();
  if (coupon.startDate && new Date(coupon.startDate).getTime() > now) {
    return { ok: false, reason: "not_started", message: "That coupon is not active yet." };
  }
  if (coupon.expiryDate && new Date(coupon.expiryDate).getTime() < now) {
    return { ok: false, reason: "expired", message: "That coupon has expired." };
  }
  if (coupon.usageLimit !== undefined && coupon.usageLimit !== null && (coupon.usageCount || 0) >= coupon.usageLimit) {
    return { ok: false, reason: "usage_limit", message: "That coupon has reached its usage limit." };
  }

  // Which lines the coupon may discount.
  const included = new Set((coupon.applicableProductIds || []).map(String));
  const excluded = new Set((coupon.excludedProductIds || []).map(String));
  const includedCats = new Set((coupon.applicableCategoryIds || []).map(String));
  const excludedCats = new Set((coupon.excludedCategoryIds || []).map(String));

  const categoriesOf = (productId: string): string[] => {
    const product = params.productsById?.get(productId);
    const raw = (product as unknown as { categoryIds?: unknown; categories?: unknown } | undefined) ?? {};
    const ids = Array.isArray(raw.categoryIds) ? raw.categoryIds : Array.isArray(raw.categories) ? raw.categories : [];
    return ids.map(String);
  };

  const eligible = params.lines.filter((line) => {
    if (excluded.has(line.productId)) return false;
    const cats = categoriesOf(line.productId);
    if (excludedCats.size && cats.some((c) => excludedCats.has(c))) return false;
    if (included.size && !included.has(line.productId)) return false;
    if (includedCats.size && !cats.some((c) => includedCats.has(c))) return false;
    return true;
  });

  if (!eligible.length) {
    return { ok: false, reason: "no_eligible_items", message: "That coupon does not apply to the items in your cart." };
  }

  const eligibleSubtotal = round2(eligible.reduce((sum, l) => sum + l.price * l.quantity, 0));
  const cartSubtotal = round2(params.lines.reduce((sum, l) => sum + l.price * l.quantity, 0));

  // Spend thresholds are judged on the whole cart, which is what a shopper expects from "spend ₹X".
  if (coupon.minimumSpend && cartSubtotal < coupon.minimumSpend) {
    return { ok: false, reason: "below_minimum", message: `Spend ₹${coupon.minimumSpend.toLocaleString("en-IN")} or more to use this coupon.` };
  }
  if (coupon.maximumSpend && cartSubtotal > coupon.maximumSpend) {
    return { ok: false, reason: "above_maximum", message: `This coupon applies to orders up to ₹${coupon.maximumSpend.toLocaleString("en-IN")}.` };
  }

  let discount = 0;
  switch (coupon.type) {
    case "percent":
      discount = (eligibleSubtotal * coupon.amount) / 100;
      break;
    case "fixed_product":
      // Per unit of each eligible line.
      discount = eligible.reduce((sum, l) => sum + Math.min(coupon.amount, l.price) * l.quantity, 0);
      break;
    case "fixed_cart":
    default:
      discount = coupon.amount;
      break;
  }

  // Never discount below zero, and never more than the items it applies to.
  discount = round2(Math.max(0, Math.min(discount, eligibleSubtotal)));
  if (discount <= 0) return { ok: false, reason: "no_eligible_items", message: "That coupon does not reduce this order." };

  return { ok: true, coupon, discount, eligibleSubtotal };
}

/**
 * Counts one redemption. Called inside order creation, after the order is safely stored.
 *
 * mutateCollection locks the collection, so two shoppers redeeming the last use of a coupon at the
 * same moment cannot both get past the limit.
 */
export async function redeemCoupon(couponId: string): Promise<void> {
  await mutateCollection<Coupon>("coupons", (coupons) => {
    const coupon = coupons.find((c) => c.id === couponId);
    if (!coupon) return;
    coupon.usageCount = (coupon.usageCount || 0) + 1;
    coupon.updatedAt = new Date().toISOString();
  });
}
