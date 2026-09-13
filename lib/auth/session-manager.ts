import { readCollection, writeCollection } from "@/lib/db/store";
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

/** Record or update active user session upon login or activity */
export function trackSessionActivity(params: {
  userId: string;
  userName: string;
  userEmail: string;
  userRole: string;
  reqHeaders?: Headers;
  ipAddress?: string;
}): ActiveSession {
  const sessions = readCollection<ActiveSession>("active-sessions");
  const existingIdx = sessions.findIndex((s) => s.userId === params.userId && s.status === "active");

  const now = new Date().toISOString();
  const userAgent = params.reqHeaders?.get("user-agent") || "Web Browser (Chrome/Windows)";
  
  let device = "Desktop (Windows)";
  if (userAgent.includes("Mobile")) device = "Mobile Device";
  else if (userAgent.includes("Macintosh")) device = "MacBook Pro";

  let browser = "Chrome";
  if (userAgent.includes("Firefox")) browser = "Firefox";
  else if (userAgent.includes("Safari") && !userAgent.includes("Chrome")) browser = "Safari";

  if (existingIdx >= 0) {
    sessions[existingIdx].lastActivity = now;
    sessions[existingIdx].ipAddress = params.ipAddress || sessions[existingIdx].ipAddress || "127.0.0.1";
    writeCollection("active-sessions", sessions);
    return sessions[existingIdx];
  }

  const newSession: ActiveSession = {
    id: `sess-${Date.now()}-${Math.random().toString(36).substring(2, 5)}`,
    sessionId: `sid-${Date.now()}`,
    userId: params.userId,
    userName: params.userName,
    userEmail: params.userEmail,
    userRole: params.userRole,
    loginTime: now,
    lastActivity: now,
    ipAddress: params.ipAddress || "127.0.0.1",
    device,
    browser,
    status: "active"
  };

  sessions.unshift(newSession);
  writeCollection("active-sessions", sessions.slice(0, 200));
  return newSession;
}

/** Check if a session has been force-terminated by Super Admin */
export function isSessionTerminated(userId: string): boolean {
  const sessions = readCollection<ActiveSession>("active-sessions");
  const userSess = sessions.find((s) => s.userId === userId);
  return userSess ? userSess.status === "terminated" : false;
}

/** Super Admin terminates a specific session */
export function terminateSession(sessionId: string, superAdminUser: { id?: string; email?: string; role?: string }) {
  const sessions = readCollection<ActiveSession>("active-sessions");
  const idx = sessions.findIndex((s) => s.id === sessionId || s.sessionId === sessionId);
  if (idx < 0) return false;

  const target = sessions[idx];
  sessions[idx].status = "terminated";
  writeCollection("active-sessions", sessions);

  createAuditLog({
    userId: superAdminUser.id,
    userName: superAdminUser.email,
    userRole: superAdminUser.role,
    action: "SESSION_TERMINATED",
    module: "security",
    recordId: target.userId,
    recordName: `Terminated Session for ${target.userEmail}`,
    previousData: { status: "active" },
    updatedData: { status: "terminated" },
    riskLevel: "HIGH"
  });

  return true;
}

/** Super Admin force logs out all sessions for a specific user */
export function terminateAllUserSessions(userId: string, superAdminUser: { id?: string; email?: string; role?: string }) {
  const sessions = readCollection<ActiveSession>("active-sessions");
  let updated = false;

  sessions.forEach((s) => {
    if (s.userId === userId && s.status === "active") {
      s.status = "terminated";
      updated = true;
    }
  });

  if (updated) {
    writeCollection("active-sessions", sessions);
    createAuditLog({
      userId: superAdminUser.id,
      userName: superAdminUser.email,
      userRole: superAdminUser.role,
      action: "ALL_USER_SESSIONS_TERMINATED",
      module: "security",
      recordId: userId,
      recordName: `Revoked all active sessions for User ID ${userId}`,
      riskLevel: "HIGH"
    });
  }

  return updated;
}

/** Employee Offboarding Workflow: Disable account, revoke access, terminate sessions, preserve audit trail */
export function offboardEmployee(userId: string, superAdminUser: { id?: string; email?: string; role?: string }) {
  const users = readCollection<AdminUser>("admin-users");
  const idx = users.findIndex((u) => u.id === userId);
  if (idx < 0) return { success: false, error: "User not found" };

  const target = users[idx];
  if (target.email === "admin@zafiroindio.com") {
    return { success: false, error: "Primary Super Admin account cannot be offboarded." };
  }

  // 1. Disable account
  users[idx].isActive = false;
  writeCollection("admin-users", users);

  // 2. Terminate all active sessions
  terminateAllUserSessions(userId, superAdminUser);

  // 3. Create High Risk Alert & Audit Record
  createSecurityAlert({
    type: "permission",
    severity: "HIGH",
    title: "Employee Offboarded & Account Disabled",
    description: `${superAdminUser.email || "Super Admin"} offboarded ${target.name} (${target.email}). Account disabled and all active sessions revoked.`,
    userInvolved: target.email,
    userRole: target.role
  });

  createAuditLog({
    userId: superAdminUser.id,
    userName: superAdminUser.email,
    userRole: superAdminUser.role,
    action: "USER_DISABLED_OFFBOARDED",
    module: "users",
    recordId: userId,
    recordName: `${target.name} (${target.email})`,
    previousData: { isActive: true },
    updatedData: { isActive: false, status: "Offboarded & Disabled" },
    riskLevel: "CRITICAL"
  });

  return { success: true, message: `Account for ${target.name} disabled and all sessions terminated.` };
}
