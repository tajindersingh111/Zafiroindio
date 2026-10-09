import crypto from "node:crypto";

/**
 * Shiprocket Checkout (fastrr) server-side client.
 *
 * Flow: browser -> POST /api/checkout/shiprocket/token (our server prices the cart from the
 * database) -> this client asks Shiprocket for an access token -> browser calls
 * HeadlessCheckout.addToCart(event, token, ...) -> Shiprocket hosts OTP, address + payment ->
 * the order is confirmed from Shiprocket's order webhook AND, independently, from the
 * confirmation page (which looks the order up via getOrderDetails), whichever arrives first.
 *
 * Endpoints/headers below follow Shiprocket's headless-checkout contract. Anything that may differ
 * on your account is an env var (see .env.example); there is no hard-coded credential or fake token.
 */
const DEFAULT_BASE_URL = "https://checkout-api.shiprocket.com";
const TOKEN_PATH = process.env.SHIPROCKET_CHECKOUT_TOKEN_PATH || "/api/v1/access-token/checkout";
const ORDER_DETAILS_PATH = "/api/v1/custom-platform-order/details";

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

  private credentials() {
    const apiKey = env("SHIPROCKET_CHECKOUT_API_KEY");
    const apiSecret = env("SHIPROCKET_CHECKOUT_API_SECRET");
    if (!apiKey || !apiSecret) {
      throw new ShiprocketConfigError("Shiprocket Checkout is not configured (SHIPROCKET_CHECKOUT_API_KEY / SHIPROCKET_CHECKOUT_API_SECRET).");
    }
    return { apiKey, apiSecret };
  }

  /**
   * POST a body signed with X-Api-HMAC-SHA256 (base64 HMAC of the exact bytes sent). Tries the
   * configured host first, then the known production hosts (keys only work on their own host).
   */
  private async signedPost<T>(path: string, payload: Record<string, unknown>, accept: (data: any) => T | undefined): Promise<T> {
    const { apiKey, apiSecret } = this.credentials();
    const body = JSON.stringify(payload);
    const hosts = Array.from(new Set([this.baseUrl, DEFAULT_BASE_URL, "https://fastrr-api.shiprocket.in"]));
    let lastStatus = 0;
    let lastMessage = "";
    for (const host of hosts) {
      let res: Response;
      try {
        res = await fetch(`${host}${path}`, {
          method: "POST",
          headers: { "Content-Type": "application/json", "X-Api-Key": apiKey, "X-Api-HMAC-SHA256": hmacBase64(apiSecret, body) },
          body,
          signal: AbortSignal.timeout(10_000),
          cache: "no-store",
        });
      } catch (e) {
        lastMessage = (e as Error).message;
        console.error(`[shiprocket-checkout] ${host}${path} unreachable:`, lastMessage);
        continue;
      }
      const data = await res.json().catch(() => ({}));
      const value = res.ok ? accept(data) : undefined;
      if (value !== undefined) {
        if (host !== this.baseUrl) console.warn(`[shiprocket-checkout] ${path} OK via ${host}; set SHIPROCKET_CHECKOUT_BASE_URL to this value.`);
        return value;
      }
      lastStatus = res.status;
      lastMessage = data?.message || data?.error?.message || data?.error || (typeof data?.result === "string" ? data.result : "") || `HTTP ${res.status}`;
      console.error(`[shiprocket-checkout] ${host}${path} rejected:`, res.status, JSON.stringify(data).slice(0, 300));
      // 4xx other than auth means the request itself is wrong: another host will not help.
      if (res.status >= 400 && res.status < 500 && res.status !== 401 && res.status !== 403 && res.status !== 404) break;
    }
    throw new ShiprocketApiError(lastMessage || "Shiprocket rejected the request.", lastStatus);
  }

  /** Ask Shiprocket for a checkout access token for this (server-priced) cart. */
  async createCheckoutToken(lines: CheckoutLine[], redirectUrl: string): Promise<CheckoutTokenResult> {
    return this.signedPost(
      TOKEN_PATH,
      {
        cart_data: { items: lines.map((l) => ({ variant_id: String(l.variantId), quantity: l.quantity })), mobile_app: false },
        redirect_url: redirectUrl,
        timestamp: new Date().toISOString(),
      },
      (data) => {
        const result = data && typeof data.result === "object" ? data.result : undefined;
        if (!result?.token) return undefined;
        return { token: String(result.token), orderId: result.data?.order_id !== undefined ? String(result.data.order_id) : undefined, expiresAt: result.expires_at };
      }
    );
  }

  /**
   * The order exactly as Shiprocket recorded it (customer, address, items, payment). Fetched
   * server-to-server with our own credentials, so it is trustworthy even when a webhook is not.
   * Returns null when Shiprocket does not know the order.
   */
  async getOrderDetails(orderId: string): Promise<Record<string, any> | null> {
    try {
      return await this.signedPost(ORDER_DETAILS_PATH, { order_id: orderId, timestamp: new Date().toISOString() }, (data) =>
        data && typeof data.result === "object" && data.result ? (data.result as Record<string, any>) : undefined
      );
    } catch (e) {
      if (e instanceof ShiprocketApiError && (e.status === 400 || e.status === 404)) return null;
      throw e;
    }
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
