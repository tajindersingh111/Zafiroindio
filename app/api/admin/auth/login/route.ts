import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { findAdminByEmail, buildSessionCookie, SESSION_COOKIE_NAME, SESSION_COOKIE_MAX_AGE } from "@/lib/auth/session";
import { createSession } from "@/lib/auth/session-manager";
import { upsertDoc } from "@/lib/db/store";
import { createAuditLog } from "@/lib/db/audit";
import { createSecurityAlert } from "@/lib/db/anomalies";
import { checkRateLimit, rateLimitResponse } from "@/lib/security/rate-limit";
import { getClientIp } from "@/lib/security/client-ip";

// Compared against when the e-mail is unknown, so response time does not reveal which e-mails exist.
const DUMMY_HASH = "$2b$10$CwTycUXWue0Thq9StjUM0uJ8.3TGZb0XQeX6x8xX0h2nQ3QpYy3bS";

export async function POST(request: Request) {
  try {
    const ip = getClientIp(request);

    // Brute-force protection: per IP, and per IP + account.
    const ipLimit = await checkRateLimit(`admin-login:ip:${ip}`, { windowMs: 15 * 60_000, maxRequests: 20 });
    if (!ipLimit.success) return rateLimitResponse(ipLimit.reset);

    let body: { email?: unknown; password?: unknown };
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: "Invalid request." }, { status: 400 });
    }
    const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
    const password = typeof body.password === "string" ? body.password : "";

    if (!email || !password || email.length > 254 || password.length > 200) {
      return NextResponse.json({ error: "Email and password are required." }, { status: 400 });
    }

    const accountLimit = await checkRateLimit(`admin-login:acct:${ip}:${email}`, { windowMs: 15 * 60_000, maxRequests: 6 });
    if (!accountLimit.success) return rateLimitResponse(accountLimit.reset);

    const user = await findAdminByEmail(email);
    const valid = await bcrypt.compare(password, user?.passwordHash ?? DUMMY_HASH);

    if (!user || !valid) {
      await createAuditLog({
        userId: user?.id ?? "unknown",
        userName: email,
        userRole: user?.role ?? "unknown",
        action: "LOGIN_FAILED",
        module: "auth",
        recordId: user?.id ?? email,
        recordName: `Failed login attempt (${email})`,
        status: "failed",
        ipAddress: ip,
        isSuspicious: true,
      });
      if (user && accountLimit.remaining === 0) {
        await createSecurityAlert({
          type: "auth",
          severity: "HIGH",
          title: "Repeated failed admin logins",
          description: `Account ${user.email} hit the failed-login limit from IP ${ip}.`,
          userInvolved: user.email,
          userRole: user.role,
        });
      }
      return NextResponse.json({ error: "Invalid credentials." }, { status: 401 });
    }

    await upsertDoc("admin-users", { ...user, lastLoginAt: new Date().toISOString() });

    const session = await createSession({
      userId: user.id,
      userName: user.name,
      userEmail: user.email,
      userRole: user.role,
      userAgent: request.headers.get("user-agent") || "",
      ipAddress: ip,
    });

    await createAuditLog({
      userId: user.id,
      userName: user.email,
      userRole: user.role,
      action: "LOGIN_SUCCESS",
      module: "auth",
      recordId: user.id,
      recordName: `Logged in (${user.email})`,
      status: "success",
      ipAddress: ip,
    });

    const response = NextResponse.json({ success: true, user: { id: user.id, name: user.name, email: user.email, role: user.role } });
    response.cookies.set(SESSION_COOKIE_NAME, buildSessionCookie(user, session.id), {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: SESSION_COOKIE_MAX_AGE,
      path: "/",
    });
    return response;
  } catch (err) {
    console.error("Login error:", err);
    return NextResponse.json({ error: "Internal server error." }, { status: 500 });
  }
}
