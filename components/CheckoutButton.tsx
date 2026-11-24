"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Lock } from "lucide-react";
import { useStore } from "@/components/StoreProvider";
import { stashBuyNow, type BuyNowItem } from "@/lib/checkout/buy-now";
import { preloadRazorpaySdk } from "@/lib/checkout/razorpay-launch";
import { trackInitiateCheckout } from "@/lib/analytics/pixel";

export type CheckoutSource = "cart" | "buy-now";

/**
 * Sends the shopper to our own checkout page (/checkout).
 *
 * Replaces the Shiprocket drawer: address, coupon and payment now happen on our page, with
 * Razorpay for online payment and COD handled by us. Same props as the old button so the call
 * sites did not have to change shape.
 *
 * "Buy it now" stashes just that line and leaves the cart untouched.
 */
export default function CheckoutButton({
  label = "Secure Checkout",
  items,
  source = "cart",
  className = "btn gold full",
  style,
  onBeforeStart,
}: {
  label?: React.ReactNode;
  items?: BuyNowItem[];
  source?: CheckoutSource;
  className?: string;
  style?: React.CSSProperties;
  onBeforeStart?: () => void;
}) {
  const router = useRouter();
  const { cart } = useStore();
  const [busy, setBusy] = useState(false);
  const hasLines = source === "buy-now" ? !!items?.length : cart.length > 0;

  // Warm the payment window while the shopper is still reading the page.
  useEffect(() => preloadRazorpaySdk(), []);

  function go() {
    if (busy || !hasLines) return;
    setBusy(true);
    onBeforeStart?.();
    if (source === "buy-now" && items?.length) {
      // Buy-it-now stashes only ids and quantities, so that is all the event can carry; the real
      // money is reported by Purchase, which reads the priced order.
      trackInitiateCheckout(
        items.map((i) => ({ id: i.productId, name: i.productId, price: undefined, quantity: i.qty })),
        undefined
      );
      stashBuyNow(items);
      router.push("/checkout?mode=buy-now");
    } else {
      trackInitiateCheckout(
        cart.map((x) => ({ id: x.product.slug, name: x.product.name, price: x.product.price, quantity: x.qty })),
        cart.reduce((sum, x) => sum + x.product.price * x.qty, 0)
      );
      router.push("/checkout");
    }
  }

  return (
    <button
      type="button"
      className={className}
      onClick={go}
      disabled={busy || !hasLines}
      aria-busy={busy}
      style={style ?? { padding: "16px 22px", fontSize: 12.5 }}
    >
      {busy ? (
        <>
          <span className="spinner" aria-hidden="true" /> Opening checkout…
        </>
      ) : (
        <>
          <Lock size={14} /> {label}
        </>
      )}
    </button>
  );
}
