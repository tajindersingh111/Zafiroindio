import { NextRequest, NextResponse } from "next/server";
import { parseSessionString, SESSION_COOKIE_NAME, type AdminSession } from "@/lib/auth/session";
import { isSessionActive, touchSession } from "@/lib/auth/session-manager";
import { getDoc } from "@/lib/db/store";
import { createAuditLog } from "@/lib/db/audit";
import { normalizeRoleKey, defaultSectionsForRole } from "@/lib/auth/access";
import type { AdminUser } from "@/lib/db/types";

export const SESSION_COOKIE = SESSION_COOKIE_NAME;

export type UserRole = "super_admin" | "admin" | "manager" | "staff";

/** Normalizes role strings e.g. "Super Admin" or "super_admin" or "order_manager" */
export function normalizeRole(role: string): UserRole {
  if (!role) return "staff";
  const lower = normalizeRoleKey(role);
  if (lower === "super_admin" || lower === "superadmin") return "super_admin";
  if (lower === "admin") return "admin";
  if (lower === "manager" || lower === "order_manager" || lower === "inventory_manager") return "manager";
  return "staff";
}

export function isSuperAdmin(role: string): boolean {
  return normalizeRole(role) === "super_admin";
}

/** STRICT DELETE PERMISSION: true ONLY for Super Admin */
export function canUserDelete(role: string): boolean {
  return isSuperAdmin(role);
}

/**
 * Authoritative session check used by every admin API:
 *  1. cookie signature + expiry
 *  2. server-side session still active (a Super Admin can revoke it)
 *  3. the user still exists and is active; role / sections are re-read from the database,
 *     so demotions and offboarding take effect immediately instead of after 7 days.
 */
export async function getAuthSession(req: NextRequest | Request): Promise<AdminSession | null> {
  const cookieHeader = req.headers.get("cookie") || "";
  const match = cookieHeader.match(new RegExp(`(?:^|;\\s*)${SESSION_COOKIE_NAME}=([^;]+)`));
  const session = parseSessionString(match ? decodeURIComponent(match[1]) : null);
  if (!session) return null;

  try {
    if (!(await isSessionActive(session.sid))) return null;
    const user = await getDoc<AdminUser>("admin-users", session.userId);
    if (!user || !user.isActive) return null;
    void touchSession(session.sid).catch(() => {});
    return {
      ...session,
      name: user.name,
      email: user.email,
      role: user.role,
      allowedSections: user.allowedSections && user.allowedSections.length ? user.allowedSections : defaultSectionsForRole(user.role),
    };
  } catch (error) {
    console.error("Session verification failed:", error);
    return null;
  }
}

export function unauthorizedResponse(message = "Unauthorized. Invalid or expired session.") {
  return NextResponse.json({ error: message, success: false }, { status: 401 });
}

export function forbiddenResponse(message = "Forbidden. Only Super Admin has permission to perform this action.") {
  return NextResponse.json({ error: message, success: false }, { status: 403 });
}

/** Enforce Super Admin requirement for API routes */
export async function requireSuperAdmin(req: NextRequest) {
  const session = await getAuthSession(req);
  if (!session) return { error: unauthorizedResponse(), session: null };
  if (!isSuperAdmin(session.role)) {
    await createAuditLog({
      userId: session.userId,
      userName: session.email,
      userRole: session.role,
      action: "UNAUTHORIZED_ADMIN_ACTION_ATTEMPT",
      module: "security",
      recordId: req.nextUrl.pathname,
      recordName: `Restricted Access Attempt on ${req.nextUrl.pathname}`,
      status: "unauthorized_blocked",
      isSuspicious: true,
    });
    return {
      error: forbiddenResponse("Access Denied: Only Super Admin has permission to perform this operation."),
      session,
    };
  }
  return { error: null, session };
}
