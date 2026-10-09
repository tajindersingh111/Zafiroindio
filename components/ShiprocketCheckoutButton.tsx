"use client";

import { useEffect, useRef, useState } from "react";
import { Lock } from "lucide-react";
import { useStore } from "@/components/StoreProvider";
import { preloadCheckoutSdk, startCheckout, type CheckoutItem, type CheckoutSource } from "@/lib/checkout/launch";

/**
 * Starts Shiprocket (Fastrr) checkout for the whole cart, or for `items` when given (Buy it now).
 * Our server prices the cart from the database; Shiprocket's hosted drawer handles OTP, address,
 * coupons and payment.
 */
export default function ShiprocketCheckoutButton({
  label = "Secure Checkout",
  items,
  source = "cart",
  className = "btn gold full",
  style,
  onBeforeStart,
}: {
  label?: React.ReactNode;
  items?: CheckoutItem[];
  source?: CheckoutSource;
  className?: string;
  style?: React.CSSProperties;
  onBeforeStart?: () => void;
}) {
  const { cart } = useStore();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const inflight = useRef(false);
  const lines: CheckoutItem[] = items ?? cart.map((x) => ({ productId: x.product.slug, qty: x.qty, size: x.size, color: x.color }));

  useEffect(() => preloadCheckoutSdk(), []);

  async function start(e: React.MouseEvent<HTMLButtonElement>) {
    if (inflight.current || !lines.length) return;
    inflight.current = true;
    setBusy(true);
    setError("");
    try {
      onBeforeStart?.();
      await startCheckout(lines, e.nativeEvent, source);
    } catch (err: any) {
      setError(err?.message || "Something went wrong. Please try again.");
    } finally {
      inflight.current = false;
      setBusy(false);
    }
  }

  return (
    <div>
      <button type="button" className={className} onClick={start} disabled={busy || !lines.length} aria-busy={busy} style={style ?? { padding: "16px 22px", fontSize: 12.5 }}>
        {busy ? (
          <>
            <span className="spinner" aria-hidden="true" /> Opening secure checkout…
          </>
        ) : (
          <>
            <Lock size={14} /> {label}
          </>
        )}
      </button>
      {error && (
        <p role="alert" style={{ color: "var(--danger)", fontSize: 12.5, marginTop: 10 }}>
          {error}
        </p>
      )}
    </div>
  );
}
