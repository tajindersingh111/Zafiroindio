"use client";

/**
 * Opens Shiprocket Checkout (Fastrr) for a set of cart lines.
 *
 * Our server prices the lines from the database and returns a signed token; Shiprocket's hosted
 * drawer then collects phone OTP, address, coupon and payment. The SDK is preloaded as soon as a
 * checkout entry point renders, so a click only waits for the token request.
 */
export type CheckoutItem = { productId: string; qty: number; size?: string; color?: string };

// Official SDK first; an env override (if any) is tried before it, and the legacy host last.
const SDK_URLS = Array.from(
  new Set(
    [
      process.env.NEXT_PUBLIC_SHIPROCKET_CHECKOUT_SDK_URL,
      "https://checkout-ui.shiprocket.com/assets/js/channels/shopify.js",
      "https://fastrr-boost-ui.pickrr.com/assets/js/channels/shopify.js",
    ].filter((u): u is string => !!u && u.endsWith(".js"))
  )
);
const CSS_URL = process.env.NEXT_PUBLIC_SHIPROCKET_CHECKOUT_CSS_URL || "https://checkout-ui.shiprocket.com/assets/styles/shopify.css";

type Win = Window & { HeadlessCheckout?: { addToCart: (e: Event, token: string, opts: { fallbackUrl: string }) => Promise<unknown> | unknown } };

let sdkPromise: Promise<void> | null = null;

function injectScript(src: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const s = document.createElement("script");
    s.src = src;
    s.async = true;
    // The SDK normally defines HeadlessCheckout as it runs; allow a short grace period in case it initialises late.
    s.onload = () => {
      const started = Date.now();
      const check = () => {
        if ((window as Win).HeadlessCheckout) return resolve();
        if (Date.now() - started > 4000) return reject(new Error(`HeadlessCheckout missing after loading ${src}`));
        setTimeout(check, 100);
      };
      check();
    };
    s.onerror = () => {
      s.remove();
      reject(new Error(`Could not load ${src}`));
    };
    document.body.appendChild(s);
  });
}

/** Loads the Shiprocket SDK once per page (safe to call many times). */
export function loadCheckoutSdk(): Promise<void> {
  if (typeof window === "undefined") return Promise.reject(new Error("no window"));
  if ((window as Win).HeadlessCheckout) return Promise.resolve();
  if (sdkPromise) return sdkPromise;

  if (!document.querySelector("link[data-sr-checkout]")) {
    const l = document.createElement("link");
    l.rel = "stylesheet";
    l.href = CSS_URL;
    l.setAttribute("data-sr-checkout", "1");
    document.head.appendChild(l);
  }
  sdkPromise = (async () => {
    for (const url of SDK_URLS) {
      try {
        await injectScript(url);
        return;
      } catch (e) {
        console.error("[checkout]", (e as Error).message);
      }
    }
    throw new Error("Could not load the secure checkout. Please check your connection and try again.");
  })().catch((e) => {
    sdkPromise = null; // allow a retry on the next click
    throw e;
  });
  return sdkPromise;
}

/** Warm the SDK in the background (idle time) without surfacing errors. */
export function preloadCheckoutSdk(): void {
  if (typeof window === "undefined") return;
  const go = () => loadCheckoutSdk().catch(() => {});
  if ("requestIdleCallback" in window) (window as any).requestIdleCallback(go, { timeout: 2500 });
  else setTimeout(go, 800);
}

export type CheckoutSource = "cart" | "buy-now";

/** Starts checkout. Resolves once Shiprocket's drawer has been asked to open; throws a shopper-friendly error. */
export async function startCheckout(items: CheckoutItem[], event: Event, source: CheckoutSource = "cart"): Promise<void> {
  if (!items.length) throw new Error("Your cart is empty.");
  const [res] = await Promise.all([
    fetch("/api/checkout/shiprocket/token", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ items }),
    }),
    loadCheckoutSdk(),
  ]);
  const data = await res.json().catch(() => ({}));
  if (!res.ok || !data.token) throw new Error(data.error || "Checkout is unavailable right now. Please try again in a moment.");
  // The confirmation page empties the cart only for a cart checkout (Buy it now leaves it alone).
  try {
    sessionStorage.setItem(`zafiro-checkout:${data.ref}`, source);
  } catch {}
  await (window as Win).HeadlessCheckout!.addToCart(event, data.token, { fallbackUrl: data.fallbackUrl || `${location.origin}/cart` });
}
