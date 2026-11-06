"use client";

/**
 * Loads and opens Razorpay Checkout in the browser.
 *
 * The amount, currency and order id all come from our server (which computed them from the
 * database); nothing here decides what is charged. The handshake Razorpay returns is sent straight
 * back to /api/checkout/verify, which re-reads the payment from Razorpay before any order exists.
 */

const SDK_URL = "https://checkout.razorpay.com/v1/checkout.js";

export interface RazorpayHandshake {
  razorpay_order_id: string;
  razorpay_payment_id: string;
  razorpay_signature: string;
}

interface RazorpayInstance {
  open: () => void;
  on: (event: string, handler: (response: unknown) => void) => void;
}

type Win = Window & { Razorpay?: new (options: Record<string, unknown>) => RazorpayInstance };

let sdkPromise: Promise<void> | null = null;

/** Loads checkout.js once per page (safe to call many times). */
export function loadRazorpaySdk(): Promise<void> {
  if (typeof window === "undefined") return Promise.reject(new Error("no window"));
  if ((window as Win).Razorpay) return Promise.resolve();
  if (sdkPromise) return sdkPromise;

  sdkPromise = new Promise<void>((resolve, reject) => {
    const existing = document.querySelector<HTMLScriptElement>(`script[src="${SDK_URL}"]`);
    if (existing) {
      existing.addEventListener("load", () => resolve());
      existing.addEventListener("error", () => reject(new Error("Could not load the payment window.")));
      if ((window as Win).Razorpay) resolve();
      return;
    }
    const script = document.createElement("script");
    script.src = SDK_URL;
    script.async = true;
    script.onload = () => ((window as Win).Razorpay ? resolve() : reject(new Error("Could not load the payment window.")));
    script.onerror = () => {
      script.remove();
      reject(new Error("Could not load the payment window. Please check your connection."));
    };
    document.body.appendChild(script);
  }).catch((e) => {
    sdkPromise = null; // allow a retry on the next click
    throw e;
  });

  return sdkPromise;
}

/** Warm the SDK in the background (idle time) without surfacing errors. */
export function preloadRazorpaySdk(): void {
  if (typeof window === "undefined") return;
  const go = () => loadRazorpaySdk().catch(() => {});
  if ("requestIdleCallback" in window) (window as any).requestIdleCallback(go, { timeout: 2500 });
  else setTimeout(go, 800);
}

export interface OpenCheckoutParams {
  keyId: string;
  orderId: string;
  amount: number; // paise
  currency: string;
  name: string;
  description: string;
  prefill: { name: string; email: string; contact: string };
  themeColor?: string;
  notes?: Record<string, string>;
}

export type CheckoutOutcome =
  | { status: "paid"; handshake: RazorpayHandshake }
  | { status: "dismissed" }
  | { status: "failed"; message: string };

/**
 * Opens the payment window and resolves once the shopper is done.
 *
 * Resolves rather than throws for a dismissal or a declined card: those are normal outcomes the
 * checkout page needs to show differently, not errors.
 */
export function openRazorpayCheckout(params: OpenCheckoutParams): Promise<CheckoutOutcome> {
  return new Promise((resolve) => {
    const Razorpay = (window as Win).Razorpay;
    if (!Razorpay) return resolve({ status: "failed", message: "The payment window is not available. Please try again." });

    let settled = false;
    const settle = (outcome: CheckoutOutcome) => {
      if (settled) return;
      settled = true;
      resolve(outcome);
    };

    const instance = new Razorpay({
      key: params.keyId,
      order_id: params.orderId,
      amount: params.amount,
      currency: params.currency,
      name: params.name,
      description: params.description,
      prefill: params.prefill,
      notes: params.notes || {},
      theme: { color: params.themeColor || "#9a7b1c" },
      // Razorpay's own retry UI would re-use this order; we would rather own the retry.
      retry: { enabled: false },
      modal: {
        confirm_close: true,
        ondismiss: () => settle({ status: "dismissed" }),
      },
      handler: (response: RazorpayHandshake) => settle({ status: "paid", handshake: response }),
    });

    instance.on("payment.failed", (response: any) => {
      const message = response?.error?.description || "The payment did not go through. No money was taken.";
      settle({ status: "failed", message });
    });

    instance.open();
  });
}
