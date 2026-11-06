import crypto from "node:crypto";

/**
 * Razorpay REST client.
 *
 * Deliberately no SDK: the three calls we make (create order, read payment, refund) are plain HTTP
 * with Basic auth, and the signature checks are HMAC-SHA256. One less dependency in the payment
 * path is worth more than the convenience.
 *
 * Razorpay works in **paise** (integer minor units). Every amount crossing this boundary goes
 * through toPaise() / fromPaise() so a float never reaches the gateway.
 */

const API_BASE = "https://api.razorpay.com/v1";
const TIMEOUT_MS = 20_000;

export class RazorpayConfigError extends Error {}
export class RazorpayApiError extends Error {
  constructor(message: string, public status: number, public body?: unknown) {
    super(message);
  }
}

export interface RazorpayCredentials {
  keyId: string;
  keySecret: string;
}

/** Server-side keys. Throws rather than falling back, so a misconfigured deploy fails loudly. */
export function getRazorpayCredentials(): RazorpayCredentials {
  const keyId = process.env.RAZORPAY_KEY_ID?.trim();
  const keySecret = process.env.RAZORPAY_KEY_SECRET?.trim();
  if (!keyId || !keySecret) {
    throw new RazorpayConfigError("Razorpay is not configured. Set RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET.");
  }
  return { keyId, keySecret };
}

export function isRazorpayConfigured(): boolean {
  return !!(process.env.RAZORPAY_KEY_ID?.trim() && process.env.RAZORPAY_KEY_SECRET?.trim());
}

/** True when the configured keys are Razorpay **test** keys (`rzp_test_…`). */
export function isRazorpayTestMode(): boolean {
  return (process.env.RAZORPAY_KEY_ID?.trim() || "").startsWith("rzp_test_");
}

/** Rupees → paise. Rounds to the nearest paise so 1999.999 can never become 199999.9. */
export function toPaise(rupees: number): number {
  if (!Number.isFinite(rupees) || rupees < 0) throw new RazorpayApiError("Invalid amount.", 400);
  return Math.round(rupees * 100);
}

export function fromPaise(paise: number): number {
  return Math.round(Number(paise)) / 100;
}

async function call<T>(path: string, init: RequestInit = {}): Promise<T> {
  const { keyId, keySecret } = getRazorpayCredentials();
  const auth = Buffer.from(`${keyId}:${keySecret}`).toString("base64");

  let res: Response;
  try {
    res = await fetch(`${API_BASE}${path}`, {
      ...init,
      headers: {
        Authorization: `Basic ${auth}`,
        "Content-Type": "application/json",
        ...(init.headers || {}),
      },
      signal: AbortSignal.timeout(TIMEOUT_MS),
      cache: "no-store",
    });
  } catch (e) {
    throw new RazorpayApiError(`Could not reach Razorpay: ${(e as Error).message}`, 504);
  }

  const text = await res.text();
  let body: any;
  try {
    body = text ? JSON.parse(text) : {};
  } catch {
    body = { raw: text.slice(0, 500) };
  }

  if (!res.ok) {
    const description = body?.error?.description || body?.message || `HTTP ${res.status}`;
    throw new RazorpayApiError(description, res.status, body);
  }
  return body as T;
}

export interface RazorpayOrder {
  id: string;
  amount: number; // paise
  currency: string;
  receipt?: string;
  status: "created" | "attempted" | "paid";
  notes?: Record<string, string>;
}

/**
 * Creates a Razorpay order for an amount we calculated ourselves from the database.
 * `receipt` is our checkout reference, so a payment can always be traced back to a checkout.
 */
export async function createRazorpayOrder(params: {
  amountRupees: number;
  receipt: string;
  notes?: Record<string, string>;
  currency?: string;
}): Promise<RazorpayOrder> {
  return call<RazorpayOrder>("/orders", {
    method: "POST",
    body: JSON.stringify({
      amount: toPaise(params.amountRupees),
      currency: params.currency || "INR",
      receipt: params.receipt.slice(0, 40), // Razorpay caps receipt at 40 chars
      notes: params.notes || {},
      payment_capture: 1, // capture automatically; we never hold an authorisation
    }),
  });
}

export interface RazorpayPayment {
  id: string;
  order_id: string;
  amount: number; // paise
  currency: string;
  status: "created" | "authorized" | "captured" | "refunded" | "failed";
  method?: string;
  email?: string;
  contact?: string;
  error_description?: string;
  notes?: Record<string, string>;
}

/** Reads a payment from Razorpay. This — not the browser — is the authority on whether we were paid. */
export function fetchRazorpayPayment(paymentId: string): Promise<RazorpayPayment> {
  return call<RazorpayPayment>(`/payments/${encodeURIComponent(paymentId)}`);
}

export function fetchRazorpayOrder(orderId: string): Promise<RazorpayOrder> {
  return call<RazorpayOrder>(`/orders/${encodeURIComponent(orderId)}`);
}

/**
 * Every payment attempted against an order, newest state included.
 *
 * Used by the confirmation page: if the shopper paid but the handshake never reached us (tab
 * closed, network dropped) and the webhook is late, this finds the successful payment so the order
 * is still created.
 */
export async function fetchRazorpayOrderPayments(orderId: string): Promise<RazorpayPayment[]> {
  const result = await call<{ items?: RazorpayPayment[] }>(`/orders/${encodeURIComponent(orderId)}/payments`);
  return Array.isArray(result.items) ? result.items : [];
}

export interface RazorpayRefund {
  id: string;
  payment_id: string;
  amount: number;
  status: string;
}

/** Refunds a captured payment. Omit the amount for a full refund. */
export function createRazorpayRefund(paymentId: string, amountRupees?: number, notes?: Record<string, string>): Promise<RazorpayRefund> {
  return call<RazorpayRefund>(`/payments/${encodeURIComponent(paymentId)}/refund`, {
    method: "POST",
    body: JSON.stringify({
      ...(amountRupees !== undefined ? { amount: toPaise(amountRupees) } : {}),
      ...(notes ? { notes } : {}),
      speed: "normal",
    }),
  });
}

function timingSafeEqualHex(a: string, b: string): boolean {
  const ab = Buffer.from(a, "utf8");
  const bb = Buffer.from(b, "utf8");
  return ab.length === bb.length && crypto.timingSafeEqual(ab, bb);
}

/**
 * Verifies the handshake the browser hands back after Razorpay Checkout closes:
 * HMAC-SHA256("<razorpay_order_id>|<razorpay_payment_id>", key_secret).
 *
 * A valid signature proves the values came from Razorpay — but not that the money arrived, so the
 * payment is still read back from the API before an order is stored.
 */
export function verifyPaymentSignature(params: { razorpayOrderId: string; razorpayPaymentId: string; signature: string }): boolean {
  const { keySecret } = getRazorpayCredentials();
  if (!params.razorpayOrderId || !params.razorpayPaymentId || !params.signature) return false;
  const expected = crypto
    .createHmac("sha256", keySecret)
    .update(`${params.razorpayOrderId}|${params.razorpayPaymentId}`)
    .digest("hex");
  return timingSafeEqualHex(expected, params.signature);
}

/**
 * Verifies a Razorpay webhook: HMAC-SHA256 of the **raw** request body with the webhook secret,
 * compared against the `x-razorpay-signature` header.
 *
 * The body must be the exact bytes Razorpay sent — re-serialising parsed JSON changes the digest.
 */
export function verifyWebhookSignature(rawBody: string, signature: string | null): boolean {
  const secret = process.env.RAZORPAY_WEBHOOK_SECRET?.trim();
  if (!secret || !signature) return false;
  const expected = crypto.createHmac("sha256", secret).update(rawBody, "utf8").digest("hex");
  return timingSafeEqualHex(expected, signature);
}

export function isWebhookConfigured(): boolean {
  return !!process.env.RAZORPAY_WEBHOOK_SECRET?.trim();
}

/** The publishable key the browser needs to open Checkout. Safe to expose. */
export function getPublicRazorpayKeyId(): string {
  return process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID?.trim() || process.env.RAZORPAY_KEY_ID?.trim() || "";
}
