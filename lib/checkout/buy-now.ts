"use client";

import type { CartItemInput } from "@/lib/checkout/schema";

/**
 * "Buy it now" hands a single line to the checkout page without touching the cart — which is the
 * whole point of the button, and how the Shiprocket flow behaved too.
 *
 * sessionStorage (not the URL) so quantities and options cannot be edited in the address bar; the
 * server prices whatever arrives from the database anyway, so this is about intent, not trust.
 */

const KEY = "zafiro-buy-now";

export type BuyNowItem = Pick<CartItemInput, "productId" | "qty" | "size" | "color">;

export function stashBuyNow(items: BuyNowItem[]): void {
  try {
    sessionStorage.setItem(KEY, JSON.stringify({ items, at: Date.now() }));
  } catch {
    // Private mode / storage disabled: checkout falls back to the cart.
  }
}

/** The stashed line, if it was put there in the last 30 minutes. */
export function readBuyNow(): BuyNowItem[] | null {
  try {
    const raw = sessionStorage.getItem(KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as { items?: unknown; at?: unknown };
    if (typeof parsed.at === "number" && Date.now() - parsed.at > 30 * 60 * 1000) {
      clearBuyNow();
      return null;
    }
    if (!Array.isArray(parsed.items) || !parsed.items.length) return null;
    return parsed.items as BuyNowItem[];
  } catch {
    return null;
  }
}

export function clearBuyNow(): void {
  try {
    sessionStorage.removeItem(KEY);
  } catch {
    // Nothing to do.
  }
}
