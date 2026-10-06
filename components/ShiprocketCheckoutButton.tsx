"use client";

import { useRef, useState } from "react";
import { Lock } from "lucide-react";
import { useStore } from "@/components/StoreProvider";

const SDK_URL = process.env.NEXT_PUBLIC_SHIPROCKET_CHECKOUT_SDK_URL || "https://fastrr-boost-ui.pickrr.com/assets/js/channels/headless.js";
const CSS_URL = process.env.NEXT_PUBLIC_SHIPROCKET_CHECKOUT_CSS_URL || "https://fastrr-boost-ui.pickrr.com/assets/styles/shopify.css";

let sdkPromise: Promise<void> | null = null;

function loadSdk(): Promise<void> {
  if (typeof window === "undefined") return Promise.reject(new Error("no window"));
  if ((window as any).HeadlessCheckout) return Promise.resolve();
  if (sdkPromise) return sdkPromise;
  sdkPromise = new Promise<void>((resolve, reject) => {
    if (CSS_URL && !document.querySelector(`link[data-sr-checkout]`)) {
      const l = document.createElement("link");
      l.rel = "stylesheet";
      l.href = CSS_URL;
      l.setAttribute("data-sr-checkout", "1");
      document.head.appendChild(l);
    }
    const s = document.createElement("script");
    s.src = SDK_URL;
    s.async = true;
    s.onload = () => ((window as any).HeadlessCheckout ? resolve() : reject(new Error("Checkout SDK loaded but HeadlessCheckout is missing.")));
    s.onerror = () => {
      sdkPromise = null;
      reject(new Error("Could not load the secure checkout. Please check your connection and try again."));
    };
    document.body.appendChild(s);
  });
  return sdkPromise;
}

/**
 * Starts Shiprocket (Fastrr) checkout. Our server prices the cart from the database and returns a
 * signed token; Shiprocket's hosted flow then handles address, payment and coupons.
 */
export default function ShiprocketCheckoutButton({ label = "Secure Checkout" }: { label?: string }) {
  const { cart } = useStore();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const inflight = useRef(false);

  async function start(e: React.MouseEvent<HTMLButtonElement>) {
    if (inflight.current || !cart.length) return;
    inflight.current = true;
    setBusy(true);
    setError("");
    const nativeEvent = e.nativeEvent;
    try {
      const [res] = await Promise.all([
        fetch("/api/checkout/shiprocket/token", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            items: cart.map((x) => ({ productId: x.product.slug, qty: x.qty, size: x.size, color: x.color })),
          }),
        }),
        loadSdk(),
      ]);
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data.token) throw new Error(data.error || "Checkout is unavailable right now. Please try again in a moment.");

      const w = window as any;
      await w.HeadlessCheckout.addToCart(nativeEvent, data.token, { fallbackUrl: data.fallbackUrl || `${location.origin}/cart` });
    } catch (err: any) {
      setError(err?.message || "Something went wrong. Please try again.");
    } finally {
      inflight.current = false;
      setBusy(false);
    }
  }

  return (
    <div>
      <button type="button" className="btn gold full" onClick={start} disabled={busy || !cart.length} style={{ padding: "16px 22px", fontSize: 12.5 }}>
        <Lock size={14} /> {busy ? "Opening secure checkout…" : label}
      </button>
      {error && (
        <p role="alert" style={{ color: "var(--danger)", fontSize: 12.5, marginTop: 10 }}>
          {error}
        </p>
      )}
    </div>
  );
}
