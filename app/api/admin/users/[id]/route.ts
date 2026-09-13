import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { readCollection, writeCollection } from "@/lib/db/store";
import type { AdminUser } from "@/lib/db/types";
import { requireSuperAdmin, getAuthSession, isSuperAdmin, forbiddenResponse } from "@/lib/auth/rbac";
import { createAuditLog } from "@/lib/db/audit";

export async function GET(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const users = readCollection<AdminUser>("admin-users");
  const user = users.find((u) => u.id === id);
  if (!user) return NextResponse.json({ error: "Not found" }, { status: 404 });
  const { passwordHash: _omit, ...safe } = user;
  return NextResponse.json({ user: safe });
}

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getAuthSession(request);
  if (!session) {
    return NextResponse.json({ error: "Unauthorized session." }, { status: 401 });
  }

  const { id } = await params;
  const body = await request.json();
  const users = readCollection<AdminUser>("admin-users");
  const idx = users.findIndex((u) => u.id === id);
  if (idx < 0) return NextResponse.json({ error: "User not found" }, { status: 404 });

  const targetUser = users[idx];

  // PROTECTION 1: Prevent non-Super-Admins from editing other users or roles
  if (!isSuperAdmin(session.role) && session.userId !== targetUser.id) {
    return forbiddenResponse("Only Super Admin can edit other admin accounts.");
  }

  // PROTECTION 2: Self-Role Escalation Prevention
  // Non-super-admin users CANNOT modify their own role or promote themselves to super_admin
  if (body.role && body.role !== targetUser.role && !isSuperAdmin(session.role)) {
    return forbiddenResponse("Permission escalation denied. Only Super Admin can change user roles.");
  }

  let newPasswordHash = targetUser.passwordHash;
  if (body.password) {
    newPasswordHash = await bcrypt.hash(body.password, 10);
  }

  const prev = { ...targetUser };
  const updatedUser: AdminUser = {
    ...targetUser,
    name: body.name ?? targetUser.name,
    email: body.email ?? targetUser.email,
    role: isSuperAdmin(session.role) ? (body.role ?? targetUser.role) : targetUser.role,
    allowedSections: isSuperAdmin(session.role) ? (body.allowedSections ?? targetUser.allowedSections) : targetUser.allowedSections,
    isActive: isSuperAdmin(session.role) ? (body.isActive ?? targetUser.isActive) : targetUser.isActive,
    passwordHash: newPasswordHash,
  };

  users[idx] = updatedUser;
  writeCollection("admin-users", users);

  // AUDIT LOG
  createAuditLog({
    userId: session.userId,
    userName: session.email,
    userRole: session.role,
    action: "UPDATE_USER",
    module: "users",
    recordId: id,
    previousData: { role: prev.role, email: prev.email },
    updatedData: { role: updatedUser.role, email: updatedUser.email }
  });

  const { passwordHash: _omit, ...safe } = updatedUser;
  return NextResponse.json({ success: true, user: safe });
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  // STRICT SUPER ADMIN DELETE CHECK
  const auth = await requireSuperAdmin(request);
  if (auth.error) return auth.error;

  const { id } = await params;
  let users = readCollection<AdminUser>("admin-users");
  const target = users.find((u) => u.id === id);
  if (!target) return NextResponse.json({ error: "User not found" }, { status: 404 });

  if (target.email === "admin@zafiroindio.com") {
    return NextResponse.json({ error: "Primary Super Admin account cannot be deleted." }, { status: 400 });
  }

  users = users.filter((u) => u.id !== id);
  writeCollection("admin-users", users);

  // AUDIT LOG
  createAuditLog({
    userId: auth.session?.userId,
    userName: auth.session?.email,
    userRole: auth.session?.role,
    action: "DELETE_USER",
    module: "users",
    recordId: id,
    previousData: target
  });

  return NextResponse.json({ success: true });
}
