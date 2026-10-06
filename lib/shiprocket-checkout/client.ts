import crypto from "node:crypto";

/**
 * Shiprocket Checkout (fastrr) server-side client.
 *
 * Flow: browser -> POST /api/checkout/shiprocket/token (our server prices the cart from the
 * database) -> this client asks Shiprocket for an access token -> browser calls
 * HeadlessCheckout.addToCart(event, token, ...) -> Shiprocket hosts address + payment ->
 * Shiprocket calls our order webhook -> we create the order.
 *
 * Endpoints/headers below follow Shiprocket's headless-checkout contract. Anything that may differ
 * on your account is an env var (see .env.example); there is no hard-coded credential or fake token.
 */
const DEFAULT_BASE_URL = "https://checkout-api.shiprocket.com";
const TOKEN_PATH = process.env.SHIPROCKET_CHECKOUT_TOKEN_PATH || "/api/v1/access-token/checkout";

export interface CheckoutLine {
  /** Numeric Shiprocket variant id (see lib/shiprocket/variants.ts). */
  variantId: string;
  quantity: number;
}

export interface CheckoutTokenResult {
  token: string;
  orderId?: string;
  expiresAt?: string;
}

export class ShiprocketConfigError extends Error {}
export class ShiprocketApiError extends Error {
  constructor(message: string, public status: number) {
    super(message);
  }
}

function env(name: string): string | undefined {
  const v = process.env[name];
  return v && v.trim() ? v.trim() : undefined;
}

export function isCheckoutConfigured(): boolean {
  return !!(env("SHIPROCKET_CHECKOUT_API_KEY") && env("SHIPROCKET_CHECKOUT_API_SECRET"));
}

function hmacBase64(secret: string, body: string): string {
  return crypto.createHmac("sha256", secret).update(body).digest("base64");
}

function hmacHex(secret: string, body: string): string {
  return crypto.createHmac("sha256", secret).update(body).digest("hex");
}

function safeEqual(a: string, b: string): boolean {
  const ab = Buffer.from(a);
  const bb = Buffer.from(b);
  return ab.length === bb.length && crypto.timingSafeEqual(ab, bb);
}

export class ShiprocketCheckoutClient {
  private get baseUrl() {
    return (env("SHIPROCKET_CHECKOUT_BASE_URL") || DEFAULT_BASE_URL).replace(/\/$/, "");
  }

  /** Ask Shiprocket for a checkout access token for this (server-priced) cart. */
  async createCheckoutToken(lines: CheckoutLine[], redirectUrl: string): Promise<CheckoutTokenResult> {
    const apiKey = env("SHIPROCKET_CHECKOUT_API_KEY");
    const apiSecret = env("SHIPROCKET_CHECKOUT_API_SECRET");
    if (!apiKey || !apiSecret) {
      throw new ShiprocketConfigError("Shiprocket Checkout is not configured (SHIPROCKET_CHECKOUT_API_KEY / SHIPROCKET_CHECKOUT_API_SECRET).");
    }

    const body = JSON.stringify({
      cart_data: { items: lines.map((l) => ({ variant_id: String(l.variantId), quantity: l.quantity })), mobile_app: false },
      redirect_url: redirectUrl,
      timestamp: new Date().toISOString(),
    });

    // Try the configured host first, then the known production hosts (keys only work on their own host).
    const hosts = Array.from(new Set([this.baseUrl, DEFAULT_BASE_URL, "https://fastrr-api.shiprocket.in"]));
    let lastStatus = 0;
    let lastMessage = "";
    for (const host of hosts) {
      const res = await fetch(`${host}${TOKEN_PATH}`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "X-Api-Key": apiKey, "X-Api-HMAC-SHA256": hmacBase64(apiSecret, body) },
        body,
        signal: AbortSignal.timeout(10_000),
        cache: "no-store",
      });
      const data = (await res.json().catch(() => ({}))) as { result?: { token?: string; data?: { order_id?: string | number }; expires_at?: string } | string; message?: string; error?: string };
      const result = typeof data.result === "object" ? data.result : undefined;
      const token = result?.token;
      if (res.ok && token) {
        if (host !== this.baseUrl) console.warn(`[shiprocket-checkout] token OK via ${host}; set SHIPROCKET_CHECKOUT_BASE_URL to this value.`);
        return { token, orderId: result?.data?.order_id !== undefined ? String(result.data.order_id) : undefined, expiresAt: result?.expires_at };
      }
      lastStatus = res.status;
      lastMessage = data.message || data.error || (typeof data.result === "string" ? data.result : "") || `HTTP ${res.status}`;
      console.error(`[shiprocket-checkout] token request rejected by ${host}${TOKEN_PATH}:`, res.status, JSON.stringify(data).slice(0, 300));
    }
    throw new ShiprocketApiError(lastMessage || "Shiprocket rejected the checkout request.", lastStatus);
  }

  /**
   * Verify an incoming Shiprocket call (order webhook or catalogue pull). The signature is an
   * HMAC-SHA256 of the raw request body (hex or base64) sent in one of the known headers.
   * Fails CLOSED: no secret, no header or a wrong signature => rejected.
   */
  verifySignature(rawBody: string, headers: Headers, extraMessages: string[] = []): boolean {
    if (process.env.NODE_ENV !== "production" && process.env.SHIPROCKET_WEBHOOK_INSECURE_DEV === "true") return true;

    const signature = headers.get("x-api-hmac-sha256") || headers.get("x-shiprocket-signature") || headers.get("x-fastrr-signature");
    if (!signature) return false;

    const secrets = [env("SHIPROCKET_CHECKOUT_WEBHOOK_SECRET"), env("SHIPROCKET_CHECKOUT_API_SECRET")].filter(Boolean) as string[];
    if (!secrets.length) return false;

    const messages = [rawBody, ...extraMessages];
    for (const secret of secrets) {
      for (const message of messages) {
        if (safeEqual(hmacBase64(secret, message), signature) || safeEqual(hmacHex(secret, message), signature)) return true;
      }
    }
    return false;
  }
}

export const shiprocketCheckoutClient = new ShiprocketCheckoutClient();
