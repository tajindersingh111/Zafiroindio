import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { findAdminByEmail, buildSessionCookie, SESSION_COOKIE_NAME, SESSION_COOKIE_MAX_AGE } from "@/lib/auth/session";
import { readCollection, writeCollection } from "@/lib/db/store";
import type { AdminUser } from "@/lib/db/types";
import { createAuditLog } from "@/lib/db/audit";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { email, password } = body as { email: string; password: string };

    if (!email || !password) {
      return NextResponse.json({ error: "Email and password are required." }, { status: 400 });
    }

    const user = findAdminByEmail(email);
    if (!user) {
      // LOG FAILED LOGIN ATTEMPT (SUSPICIOUS)
      createAuditLog({
        userId: "unknown",
        userName: email,
        userRole: "unknown",
        action: "LOGIN_FAILED",
        module: "auth",
        recordId: email,
        recordName: `Failed Login Attempt (${email})`,
        status: "failed",
        isSuspicious: true
      });

      return NextResponse.json({ error: "Invalid credentials." }, { status: 401 });
    }

    const valid = await bcrypt.compare(password, user.passwordHash);
    if (!valid) {
      // LOG FAILED LOGIN ATTEMPT (SUSPICIOUS)
      createAuditLog({
        userId: user.id,
        userName: user.email,
        userRole: user.role,
        action: "LOGIN_FAILED",
        module: "auth",
        recordId: user.id,
        recordName: `Invalid Password Attempt (${user.email})`,
        status: "failed",
        isSuspicious: true
      });

      return NextResponse.json({ error: "Invalid credentials." }, { status: 401 });
    }

    // Update lastLoginAt
    const users = readCollection<AdminUser>("admin-users");
    const idx = users.findIndex((u) => u.id === user.id);
    if (idx >= 0) {
      users[idx].lastLoginAt = new Date().toISOString();
      writeCollection("admin-users", users);
    }

    // LOG SUCCESSFUL LOGIN
    createAuditLog({
      userId: user.id,
      userName: user.email,
      userRole: user.role,
      action: "LOGIN_SUCCESS",
      module: "auth",
      recordId: user.id,
      recordName: `Logged in (${user.email})`,
      status: "success"
    });

    const sessionValue = await buildSessionCookie(user);
    const response = NextResponse.json({ success: true, user: { id: user.id, name: user.name, email: user.email, role: user.role } });
    response.cookies.set(SESSION_COOKIE_NAME, sessionValue, {
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
