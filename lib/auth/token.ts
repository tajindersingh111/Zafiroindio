import crypto from "node:crypto";
import type { AdminRole } from "@/lib/db/types";

export const SESSION_COOKIE_NAME = "zafiro-admin-session";
export const SESSION_COOKIE_MAX_AGE = 60 * 60 * 24 * 7; // 7 days in seconds
const SESSION_MS = SESSION_COOKIE_MAX_AGE * 1000;

let devSecret: string | undefined;

/**
 * Signing secret. There is NO hard-coded fallback: production refuses to start signing without a
 * real secret, and development uses a random per-process secret (admins just log in again after a
 * restart) instead of a publicly known default that would let anyone forge a super-admin cookie.
 */
export function getSessionSecret(): string {
  const secret = process.env.SESSION_SECRET;
  if (secret && secret.length >= 32 && !/your_secure|change[-_ ]?me|default/i.test(secret)) return secret;
  if (process.env.NODE_ENV === "production") {
    throw new Error("SESSION_SECRET must be set to a random string of at least 32 characters.");
  }
  if (!devSecret) {
    devSecret = crypto.randomBytes(32).toString("hex");
    console.warn("[auth] SESSION_SECRET missing/weak - using a random development secret for this process.");
  }
  return devSecret;
}

export interface AdminSession {
  userId: string;
  name: string;
  email: string;
  role: AdminRole;
  allowedSections?: string[];
  issuedAt: number;
  /** Server-side session id (lets a Super Admin revoke a session). */
  sid: string;
}

const b64url = (buf: Buffer) => buf.toString("base64url");

function sign(payload: string): string {
  return b64url(crypto.createHmac("sha256", getSessionSecret()).update(payload).digest());
}

function safeEqual(a: string, b: string): boolean {
  const ab = Buffer.from(a);
  const bb = Buffer.from(b);
  return ab.length === bb.length && crypto.timingSafeEqual(ab, bb);
}

/** Verify signature + expiry only (no database). Use getAuthSession() for the full check. */
export function parseSessionString(raw: string | undefined | null): AdminSession | null {
  try {
    if (!raw) return null;
    const parts = raw.split(".");
    if (parts.length !== 2) return null;
    const [payload, signature] = parts;
    if (!safeEqual(sign(payload), signature)) return null;
    const session = JSON.parse(Buffer.from(payload, "base64url").toString("utf8")) as AdminSession;
    if (!session.userId || !session.sid || typeof session.issuedAt !== "number") return null;
    if (Date.now() - session.issuedAt > SESSION_MS) return null;
    return session;
  } catch {
    return null;
  }
}

export function buildSessionCookie(user: { id: string; name: string; email: string; role: AdminRole; allowedSections?: string[] }, sid: string): string {
  const session: AdminSession = {
    userId: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
    allowedSections: user.allowedSections,
    issuedAt: Date.now(),
    sid,
  };
  const payload = b64url(Buffer.from(JSON.stringify(session), "utf8")); // utf8-safe (old btoa crashed on non-latin names)
  return `${payload}.${sign(payload)}`;
}

