import crypto from "node:crypto";
import { getSessionSecret } from "@/lib/auth/token";

/**
 * Signed session cookie for *shoppers* (not staff).
 *
 * Deliberately separate from the admin session (lib/auth/token.ts): a different cookie name and a
 * different HMAC domain, so a customer cookie can never be replayed as an admin one even though
 * both are signed with SESSION_SECRET.
 */
export const CUSTOMER_COOKIE_NAME = "zafiro-customer-session";
export const CUSTOMER_COOKIE_MAX_AGE = 60 * 60 * 24 * 60; // 60 days in seconds
const SESSION_MS = CUSTOMER_COOKIE_MAX_AGE * 1000;

export interface CustomerSession {
  customerId: string;
  phone: string;
  name: string;
  issuedAt: number;
}

const b64url = (buf: Buffer) => buf.toString("base64url");

/** Domain-separated from the admin signature by the "customer:" prefix. */
function sign(payload: string): string {
  return b64url(crypto.createHmac("sha256", getSessionSecret()).update(`customer:${payload}`).digest());
}

function safeEqual(a: string, b: string): boolean {
  const ab = Buffer.from(a);
  const bb = Buffer.from(b);
  return ab.length === bb.length && crypto.timingSafeEqual(ab, bb);
}

/**
 * Verify signature + expiry only (no database). Pure crypto, so it is safe to import from proxy.ts.
 * Use getCustomerSession() when the customer's current status matters.
 */
export function parseCustomerSession(raw: string | undefined | null): CustomerSession | null {
  try {
    if (!raw) return null;
    const parts = raw.split(".");
    if (parts.length !== 2) return null;
    const [payload, signature] = parts;
    if (!safeEqual(sign(payload), signature)) return null;
    const session = JSON.parse(Buffer.from(payload, "base64url").toString("utf8")) as CustomerSession;
    if (!session.customerId || !session.phone || typeof session.issuedAt !== "number") return null;
    if (Date.now() - session.issuedAt > SESSION_MS) return null;
    return session;
  } catch {
    return null;
  }
}

export function buildCustomerSessionCookie(customer: { id: string; phone: string; name: string }): string {
  const session: CustomerSession = {
    customerId: customer.id,
    phone: customer.phone,
    name: customer.name,
    issuedAt: Date.now(),
  };
  const payload = b64url(Buffer.from(JSON.stringify(session), "utf8"));
  return `${payload}.${sign(payload)}`;
}

/** Cookie attributes used by every route that sets or clears the shopper session. */
export function customerCookieOptions(maxAge = CUSTOMER_COOKIE_MAX_AGE) {
  return {
    httpOnly: true,
    sameSite: "lax" as const,
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge,
  };
}
