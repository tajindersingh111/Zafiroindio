import { randomUUID } from "node:crypto";
import { readCollection, getDoc, upsertDoc, mutateCollection } from "@/lib/db/store";
import { createAuditLog } from "@/lib/db/audit";
import { createSecurityAlert } from "@/lib/db/anomalies";
import type { AdminUser } from "@/lib/db/types";

export interface ActiveSession {
  id: string;
  sessionId: string;
  userId: string;
  userName: string;
  userEmail: string;
  userRole: string;
  loginTime: string;
  lastActivity: string;
  ipAddress: string;
  device: string;
  browser: string;
  status: "active" | "terminated" | "expired";
}

function describeAgent(userAgent: string) {
  let device = "Desktop";
  if (/Mobile|Android|iPhone/i.test(userAgent)) device = "Mobile Device";
  else if (/Macintosh/i.test(userAgent)) device = "Mac";
  else if (/Windows/i.test(userAgent)) device = "Windows PC";

  let browser = "Unknown";
  if (/Edg\//.test(userAgent)) browser = "Edge";
  else if (/Firefox/.test(userAgent)) browser = "Firefox";
  else if (/Chrome/.test(userAgent)) browser = "Chrome";
  else if (/Safari/.test(userAgent)) browser = "Safari";
  return { device, browser };
}

/** Create a server-side session record at login. Its id is stored in the signed cookie. */
export async function createSession(params: {
  userId: string;
  userName: string;
  userEmail: string;
  userRole: string;
  userAgent?: string;
  ipAddress?: string;
}): Promise<ActiveSession> {
  const now = new Date().toISOString();
  const { device, browser } = describeAgent(params.userAgent || "");
  const sid = randomUUID();
  const session: ActiveSession = {
    id: sid,
    sessionId: sid,
    userId: params.userId,
    userName: params.userName,
    userEmail: params.userEmail,
    userRole: params.userRole,
    loginTime: now,
    lastActivity: now,
    ipAddress: params.ipAddress || "unknown",
    device,
    browser,
    status: "active",
  };
  await upsertDoc("active-sessions", session);
  return session;
}

/** True while the session exists and has not been terminated by a Super Admin. */
export async function isSessionActive(sid: string): Promise<boolean> {
  const s = await getDoc<ActiveSession>("active-sessions", sid);
  return !!s && s.status === "active";
}

export async function touchSession(sid: string): Promise<void> {
  const s = await getDoc<ActiveSession>("active-sessions", sid);
  if (!s || s.status !== "active") return;
  if (Date.now() - new Date(s.lastActivity).getTime() < 60_000) return; // at most once a minute
  await upsertDoc("active-sessions", { ...s, lastActivity: new Date().toISOString() });
}

export async function endSession(sid: string): Promise<void> {
  const s = await getDoc<ActiveSession>("active-sessions", sid);
  if (s && s.status === "active") await upsertDoc("active-sessions", { ...s, status: "terminated" as const });
}

type Actor = { id?: string; email?: string; role?: string };

/** Super Admin terminates a specific session */
export async function terminateSession(sessionId: string, superAdminUser: Actor) {
  const s = await getDoc<ActiveSession>("active-sessions", sessionId);
  if (!s) return false;
  await upsertDoc("active-sessions", { ...s, status: "terminated" as const });

  await createAuditLog({
    userId: superAdminUser.id,
    userName: superAdminUser.email,
    userRole: superAdminUser.role,
    action: "SESSION_TERMINATED",
    module: "security",
    recordId: s.userId,
    recordName: `Terminated Session for ${s.userEmail}`,
    previousData: { status: "active" },
    updatedData: { status: "terminated" },
    riskLevel: "HIGH",
  });
  return true;
}

/** Super Admin force logs out all sessions for a specific user */
export async function terminateAllUserSessions(userId: string, superAdminUser: Actor) {
  const updated = await mutateCollection<ActiveSession, boolean>("active-sessions", (sessions) => {
    let changed = false;
    for (const s of sessions) {
      if (s.userId === userId && s.status === "active") {
        s.status = "terminated";
        changed = true;
      }
    }
    return changed;
  });

  if (updated) {
    await createAuditLog({
      userId: superAdminUser.id,
      userName: superAdminUser.email,
      userRole: superAdminUser.role,
      action: "ALL_USER_SESSIONS_TERMINATED",
      module: "security",
      recordId: userId,
      recordName: `Revoked all active sessions for User ID ${userId}`,
      riskLevel: "HIGH",
    });
  }
  return updated;
}

/** Employee offboarding: disable account, revoke every session, keep the audit trail. */
export async function offboardEmployee(userId: string, superAdminUser: Actor) {
  const users = await readCollection<AdminUser>("admin-users");
  const target = users.find((u) => u.id === userId);
  if (!target) return { success: false, error: "User not found" };

  if (target.email === "admin@zafiroindio.com") {
    return { success: false, error: "Primary Super Admin account cannot be offboarded." };
  }

  await upsertDoc("admin-users", { ...target, isActive: false });
  await terminateAllUserSessions(userId, superAdminUser);

  await createSecurityAlert({
    type: "permission",
    severity: "HIGH",
    title: "Employee Offboarded & Account Disabled",
    description: `${superAdminUser.email || "Super Admin"} offboarded ${target.name} (${target.email}). Account disabled and all active sessions revoked.`,
    userInvolved: target.email,
    userRole: target.role,
  });

  await createAuditLog({
    userId: superAdminUser.id,
    userName: superAdminUser.email,
    userRole: superAdminUser.role,
    action: "USER_DISABLED_OFFBOARDED",
    module: "users",
    recordId: userId,
    recordName: `${target.name} (${target.email})`,
    previousData: { isActive: true },
    updatedData: { isActive: false, status: "Offboarded & Disabled" },
    riskLevel: "CRITICAL",
  });

  return { success: true, message: `Account for ${target.name} disabled and all sessions terminated.` };
}
