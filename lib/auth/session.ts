import { cookies } from "next/headers";
import { readCollection } from "@/lib/db/store";
import type { AdminUser, AdminRole } from "@/lib/db/types";

const SESSION_COOKIE = "zafiro-admin-session";
const SESSION_DURATION = 60 * 60 * 24 * 7; // 7 days in seconds
const SECRET = process.env.SESSION_SECRET || "zafiro-default-super-signed-cookie-secret-key-19038";

export interface AdminSession {
  userId: string;
  name: string;
  email: string;
  role: AdminRole;
  allowedSections?: string[];
  issuedAt: number;
}

// Simple Edge-compatible SHA256 HMAC signature helper using Web Crypto API
async function sign(message: string, secretKey: string): Promise<string> {
  const encoder = new TextEncoder();
  const keyBuf = encoder.encode(secretKey);
  const msgBuf = encoder.encode(message);
  
  const cryptoSubtle = typeof crypto !== "undefined" ? crypto.subtle : (await import("crypto")).webcrypto.subtle;
  const key = await cryptoSubtle.importKey(
    "raw",
    keyBuf,
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const sigBuf = await cryptoSubtle.sign("HMAC", key, msgBuf);
  
  // Convert sigBuf to base64url
  const bytes = new Uint8Array(sigBuf);
  let binary = "";
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

async function verify(message: string, sigBase64Url: string, secretKey: string): Promise<boolean> {
  try {
    const encoder = new TextEncoder();
    const keyBuf = encoder.encode(secretKey);
    const msgBuf = encoder.encode(message);
    
    // Decode base64url
    let base64 = sigBase64Url.replace(/-/g, "+").replace(/_/g, "/");
    while (base64.length % 4) {
      base64 += "=";
    }
    const binary = atob(base64);
    const sigBytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
      sigBytes[i] = binary.charCodeAt(i);
    }
    
    const cryptoSubtle = typeof crypto !== "undefined" ? crypto.subtle : (await import("crypto")).webcrypto.subtle;
    const key = await cryptoSubtle.importKey(
      "raw",
      keyBuf,
      { name: "HMAC", hash: "SHA-256" },
      false,
      ["verify"]
    );
    return await cryptoSubtle.verify("HMAC", key, sigBytes, msgBuf);
  } catch {
    return false;
  }
}

/** Get the current admin session from cookie (server-side only) */
export async function getSession(): Promise<AdminSession | null> {
  const cookieStore = await cookies();
  const raw = cookieStore.get(SESSION_COOKIE)?.value;
  if (!raw) return null;
  
  try {
    const parts = raw.split(".");
    if (parts.length !== 2) return null;
    
    const [payloadBase64, signature] = parts;
    const payloadStr = atob(payloadBase64);
    
    // Verify signature
    const isValid = await verify(payloadBase64, signature, SECRET);
    if (!isValid) return null;
    
    const session = JSON.parse(payloadStr) as AdminSession;
    // Expire after 7 days
    if (Date.now() - session.issuedAt > SESSION_DURATION * 1000) return null;
    return session;
  } catch {
    return null;
  }
}

/** Create a session cookie (called from login API route) */
export async function buildSessionCookie(user: AdminUser): Promise<string> {
  const session: AdminSession = {
    userId: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
    allowedSections: user.allowedSections,
    issuedAt: Date.now(),
  };
  const payloadBase64 = btoa(JSON.stringify(session));
  const signature = await sign(payloadBase64, SECRET);
  return `${payloadBase64}.${signature}`;
}

/** Require auth — throws redirect if not authenticated */
export async function requireSession(): Promise<AdminSession> {
  const session = await getSession();
  if (!session) {
    throw new Error("UNAUTHENTICATED");
  }
  return session;
}

/** Look up an admin user by email */
export function findAdminByEmail(email: string): AdminUser | undefined {
  const users = readCollection<AdminUser>("admin-users");
  return users.find((u) => u.email === email && u.isActive);
}

export const SESSION_COOKIE_NAME = SESSION_COOKIE;
export const SESSION_COOKIE_MAX_AGE = SESSION_DURATION;
