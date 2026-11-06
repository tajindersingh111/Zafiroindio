import { readSettings } from "@/lib/db/store";
import { priceCart, CartError, type PricedLine } from "@/lib/pricing";
import { calculateShippingAndCodFee } from "@/lib/shipping/calculator";
import { validateCoupon } from "@/lib/checkout/coupon";
import type { Coupon, Product, StoreSettings } from "@/lib/db/types";
import type { CartItemInput, CheckoutPaymentMethod } from "@/lib/checkout/schema";

/**
 * The one place that decides what an order costs.
 *
 * Both the quote shown on the checkout page and the amount charged go through here, so the figure
 * the shopper agrees to and the figure sent to Razorpay can never drift apart. Nothing is read
 * from the browser except the product ids, quantities, chosen options, coupon code and payment
 * method — every price, fee and discount is computed from the database.
 */

export interface QuoteLine {
  productId: string;
  variationId?: string;
  name: string;
  sku: string;
  image?: string;
  quantity: number;
  price: number;
  mrp: number;
  total: number;
  size?: string;
  color?: string;
}

export interface CheckoutQuote {
  lines: QuoteLine[];
  /** Internal, richer lines (carry the Shiprocket variant id); not sent to the browser. */
  pricedLines: PricedLine[];
  /** Internal: the products the lines were priced from, for cost snapshots and shipping flags. */
  productsById: Map<string, Product>;
  subtotal: number;
  savings: number;
  discount: number;
  coupon: { code: string; discount: number; id: string } | null;
  couponError: string | null;
  shippingCost: number;
  codFee: number;
  isFreeShipping: boolean;
  freeShippingReason?: string;
  /** How much more to spend for free shipping; 0 when already free. */
  freeShippingRemaining: number;
  freeShippingThreshold: number;
  tax: number;
  total: number;
  paymentMethod: CheckoutPaymentMethod;
  codAvailable: boolean;
  codUnavailableReason?: string;
}

const round2 = (n: number) => Math.round(n * 100) / 100;

const toQuoteLine = (l: PricedLine): QuoteLine => ({
  productId: l.productId,
  variationId: l.variationId,
  name: l.name,
  sku: l.sku,
  image: l.image,
  quantity: l.quantity,
  price: l.price,
  mrp: l.mrp,
  total: l.total,
  size: l.size,
  color: l.color,
});

export { CartError };

/**
 * Prices a cart end to end. Throws CartError for anything the shopper can fix (out of stock, gone
 * product, bad quantity); a bad coupon is reported in `couponError` instead, so the rest of the
 * quote still renders.
 */
export async function buildCheckoutQuote(params: {
  items: CartItemInput[];
  couponCode?: string;
  paymentMethod: CheckoutPaymentMethod;
  customerId?: string;
}): Promise<CheckoutQuote> {
  const priced = await priceCart(params.items);
  const settings = (await readSettings<StoreSettings>("settings").catch(() => null)) ?? undefined;

  // ── Coupon ────────────────────────────────────────────────
  let coupon: { code: string; discount: number; id: string } | null = null;
  let couponError: string | null = null;
  let discount = 0;

  if (params.couponCode?.trim()) {
    const result = await validateCoupon({
      code: params.couponCode,
      lines: priced.items,
      productsById: priced.productsById,
      customerId: params.customerId,
    });
    if (result.ok) {
      discount = result.discount;
      coupon = { code: (result.coupon as Coupon).code, discount: result.discount, id: result.coupon.id };
    } else {
      couponError = result.message;
    }
  }

  // ── Shipping and COD ──────────────────────────────────────
  // COD eligibility is judged on its own so the page can grey the option out before it is picked.
  const calcItems = priced.items.map((l) => ({ productId: l.productId, quantity: l.quantity, price: l.price }));
  const codCheck = calculateShippingAndCodFee({
    items: calcItems,
    productsMap: priced.productsById,
    paymentMethod: "cod",
    storeSettings: settings,
  });
  const codAvailable = codCheck.isAllowed;

  const effectiveMethod: CheckoutPaymentMethod = params.paymentMethod === "cod" && !codAvailable ? "razorpay" : params.paymentMethod;

  const shipping = calculateShippingAndCodFee({
    items: calcItems,
    productsMap: priced.productsById,
    paymentMethod: effectiveMethod === "cod" ? "cod" : "prepaid",
    storeSettings: settings,
  });

  const freeShippingThreshold = settings?.freeShippingMinOrder ?? 2000;
  const subtotal = round2(priced.subtotal);

  const shippingCost = round2(shipping.baseShippingCost);
  const codFee = round2(shipping.codFee);
  const tax = 0; // prices are GST-inclusive; kept explicit so invoices can split it later
  const total = round2(Math.max(0, subtotal - discount + shippingCost + codFee + tax));

  return {
    lines: priced.items.map(toQuoteLine),
    pricedLines: priced.items,
    productsById: priced.productsById,
    subtotal,
    savings: round2(priced.savings),
    discount,
    coupon,
    couponError,
    shippingCost,
    codFee,
    isFreeShipping: shipping.isFreeShipping,
    freeShippingReason: shipping.freeShippingReason,
    freeShippingRemaining: shipping.isFreeShipping ? 0 : round2(Math.max(0, freeShippingThreshold - subtotal)),
    freeShippingThreshold,
    tax,
    total,
    paymentMethod: effectiveMethod,
    codAvailable,
    codUnavailableReason: codAvailable ? undefined : codCheck.error,
  };
}

/**
 * The browser-safe shape of a quote.
 *
 * Written as "drop the internal fields" rather than "list the public ones" on purpose: a field
 * added to CheckoutQuote later is then public by default, and anything internal has to be named
 * here deliberately — the safe direction for a field that should never reach a shopper is to fail
 * loudly in review, not to be silently forgotten.
 */
export function publicQuote(quote: CheckoutQuote): Omit<CheckoutQuote, "pricedLines" | "productsById"> {
  const rest: Partial<CheckoutQuote> = { ...quote };
  delete rest.pricedLines;
  delete rest.productsById;
  return rest as Omit<CheckoutQuote, "pricedLines" | "productsById">;
}
