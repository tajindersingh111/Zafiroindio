import { NextRequest, NextResponse } from "next/server";
import { readCollection, writeCollection } from "@/lib/db/store";

export const SESSION_COOKIE = "zafiro-admin-session";
export const SECRET = process.env.SESSION_SECRET || "zafiro-default-super-signed-cookie-secret-key-19038";

export type UserRole = "super_admin" | "admin" | "manager" | "staff";

export interface PermissionDefinition {
  view: boolean;
  create: boolean;
  edit: boolean;
  delete: boolean; // STRICT RULE: ONLY super_admin has delete = true
  update_status?: boolean;
}

export type PermissionMatrix = Record<string, PermissionDefinition>;

export const DEFAULT_ROLE_PERMISSIONS: Record<UserRole, PermissionMatrix> = {
  super_admin: {
    dashboard: { view: true, create: true, edit: true, delete: true },
    products: { view: true, create: true, edit: true, delete: true },
    orders: { view: true, create: true, edit: true, delete: true, update_status: true },
    customers: { view: true, create: true, edit: true, delete: true },
    inventory: { view: true, create: true, edit: true, delete: true },
    banners: { view: true, create: true, edit: true, delete: true },
    coupons: { view: true, create: true, edit: true, delete: true },
    users: { view: true, create: true, edit: true, delete: true },
    roles: { view: true, create: true, edit: true, delete: true },
    settings: { view: true, create: true, edit: true, delete: true },
    audit_logs: { view: true, create: true, edit: true, delete: true }
  },
  admin: {
    dashboard: { view: true, create: true, edit: true, delete: false },
    products: { view: true, create: true, edit: true, delete: false },
    orders: { view: true, create: true, edit: true, delete: false, update_status: true },
    customers: { view: true, create: true, edit: true, delete: false },
    inventory: { view: true, create: true, edit: true, delete: false },
    banners: { view: true, create: true, edit: true, delete: false },
    coupons: { view: true, create: true, edit: true, delete: false },
    users: { view: true, create: true, edit: false, delete: false },
    roles: { view: false, create: false, edit: false, delete: false },
    settings: { view: true, create: false, edit: true, delete: false },
    audit_logs: { view: true, create: false, edit: false, delete: false }
  },
  manager: {
    dashboard: { view: true, create: false, edit: false, delete: false },
    products: { view: true, create: true, edit: true, delete: false },
    orders: { view: true, create: false, edit: true, delete: false, update_status: true },
    customers: { view: true, create: false, edit: false, delete: false },
    inventory: { view: true, create: true, edit: true, delete: false },
    banners: { view: true, create: true, edit: false, delete: false },
    coupons: { view: true, create: false, edit: false, delete: false },
    users: { view: false, create: false, edit: false, delete: false },
    roles: { view: false, create: false, edit: false, delete: false },
    settings: { view: false, create: false, edit: false, delete: false },
    audit_logs: { view: false, create: false, edit: false, delete: false }
  },
  staff: {
    dashboard: { view: true, create: false, edit: false, delete: false },
    products: { view: true, create: false, edit: false, delete: false },
    orders: { view: true, create: false, edit: false, delete: false, update_status: true },
    customers: { view: false, create: false, edit: false, delete: false },
    inventory: { view: true, create: false, edit: true, delete: false },
    banners: { view: false, create: false, edit: false, delete: false },
    coupons: { view: false, create: false, edit: false, delete: false },
    users: { view: false, create: false, edit: false, delete: false },
    roles: { view: false, create: false, edit: false, delete: false },
    settings: { view: false, create: false, edit: false, delete: false },
    audit_logs: { view: false, create: false, edit: false, delete: false }
  }
};

/** Normalizes role strings e.g. "Super Admin" or "super_admin" or "order_manager" */
export function normalizeRole(role: string): UserRole {
  if (!role) return "staff";
  const lower = role.toLowerCase().replace(/[\s_-]+/g, "_");
  if (lower === "super_admin" || lower === "superadmin") return "super_admin";
  if (lower === "admin") return "admin";
  if (lower === "manager" || lower === "order_manager" || lower === "inventory_manager") return "manager";
  return "staff";
}

/** Check if user is Super Admin */
export function isSuperAdmin(role: string): boolean {
  return normalizeRole(role) === "super_admin";
}

/** STRICT DELETE PERMISSION: Returns true ONLY if user is Super Admin */
export function canUserDelete(role: string): boolean {
  return isSuperAdmin(role);
}

/** Edge-compatible session HMAC verification */
export async function verifySignature(message: string, sigBase64Url: string, secretKey: string): Promise<boolean> {
  try {
    const encoder = new TextEncoder();
    const keyBuf = encoder.encode(secretKey);
    const msgBuf = encoder.encode(message);
    
    let base64 = sigBase64Url.replace(/-/g, "+").replace(/_/g, "/");
    while (base64.length % 4) base64 += "=";
    
    const binary = typeof atob !== "undefined" ? atob(base64) : Buffer.from(base64, "base64").toString("binary");
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

/** Authenticate Request Session from cookies/headers */
export async function getAuthSession(req: NextRequest) {
  const cookie = req.cookies.get(SESSION_COOKIE);
  const authHeader = req.headers.get("authorization");
  
  let token = cookie?.value;
  if (!token && authHeader && authHeader.startsWith("Bearer ")) {
    token = authHeader.substring(7);
  }

  if (!token) return null;

  const parts = token.split(".");
  if (parts.length !== 2) return null;

  const [payloadBase64, signature] = parts;
  const isValid = await verifySignature(payloadBase64, signature, SECRET);
  if (!isValid) return null;

  try {
    const payloadStr = typeof atob !== "undefined" ? atob(payloadBase64) : Buffer.from(payloadBase64, "base64").toString("utf-8");
    const session = JSON.parse(payloadStr);
    
    // 7 days expiration check
    if (Date.now() - session.issuedAt > 7 * 24 * 60 * 60 * 1000) {
      return null;
    }
    return session;
  } catch {
    return null;
  }
}

/** Standard unauthorized response */
export function unauthorizedResponse(message = "Unauthorized. Invalid or expired session.") {
  return NextResponse.json({ error: message, success: false }, { status: 401 });
}

/** Standard forbidden response */
export function forbiddenResponse(message = "Forbidden. Only Super Admin has permission to perform this action.") {
  return NextResponse.json({ error: message, success: false }, { status: 403 });
}

/** Enforce Super Admin requirement for API routes */
export async function requireSuperAdmin(req: NextRequest) {
  const session = await getAuthSession(req);
  if (!session) return { error: unauthorizedResponse(), session: null };
  if (!isSuperAdmin(session.role)) {
    // LOG UNAUTHORIZED SECURITY ATTEMPT
    try {
      const { createAuditLog } = require("@/lib/db/audit");
      createAuditLog({
        userId: session.userId,
        userName: session.email,
        userRole: session.role,
        action: "UNAUTHORIZED_DELETE_ATTEMPT",
        module: "security",
        recordId: req.nextUrl.pathname,
        recordName: `Restricted Access Attempt on ${req.nextUrl.pathname}`,
        status: "unauthorized_blocked",
        isSuspicious: true
      });
    } catch (e) {}

    return { 
      error: forbiddenResponse("Access Denied: Only Super Admin has permission to delete records or perform this operation."), 
      session 
    };
  }
  return { error: null, session };
}

