import { cached } from "@/lib/cache";
import { readSettings } from "@/lib/db/store";
import type { StoreSettings } from "@/lib/db/types";

export type ShippingTerms = {
  /** Orders at or above this value ship free. */
  freeShippingMinOrder: number;
  /** Flat shipping charge below the free-shipping value. */
  shippingFee: number;
  /** Handling fee added to Cash on Delivery orders. */
  codFee: number;
};

/**
 * The shipping numbers the policy pages quote, read from the same settings the checkout charges
 * from (lib/shipping/calculator.ts uses these exact defaults), so what the page promises and what
 * the shopper pays cannot disagree.
 */
export function getShippingTerms(): Promise<ShippingTerms> {
  return cached("shipping-terms", 5 * 60_000, async () => {
    const s = (await readSettings<Partial<StoreSettings>>("settings").catch(() => null)) ?? {};
    return {
      freeShippingMinOrder: s.freeShippingMinOrder ?? 2000,
      shippingFee: s.defaultShippingFee ?? 99,
      codFee: s.defaultCodFee ?? 60,
    };
  });
}

export const rupees = (n: number) => `₹${n.toLocaleString("en-IN")}`;
