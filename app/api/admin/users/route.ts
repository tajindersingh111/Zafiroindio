import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { readCollection, writeCollection } from "@/lib/db/store";
import type { AdminUser } from "@/lib/db/types";
import { requireSuperAdmin, getAuthSession, forbiddenResponse } from "@/lib/auth/rbac";
import { createAuditLog } from "@/lib/db/audit";

export async function GET() {
  const users = readCollection<AdminUser>("admin-users");
  const safe = users.map(({ passwordHash: _omit, ...u }) => u);
  return NextResponse.json({ users: safe });
}

export async function POST(request: NextRequest) {
  // STRICT SUPER ADMIN CHECK FOR USER CREATION
  const auth = await requireSuperAdmin(request);
  if (auth.error) return auth.error;

  try {
    const body = await request.json();
    const { name, email, password, role, allowedSections } = body;

    if (!name || !email || !password || !role) {
      return NextResponse.json({ error: "Name, email, password, and role are required." }, { status: 400 });
    }

    const users = readCollection<AdminUser>("admin-users");
    const existing = users.find((u) => u.email.toLowerCase() === email.toLowerCase());
    if (existing) {
      return NextResponse.json({ error: "An admin user with this email already exists." }, { status: 400 });
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const newUser: AdminUser = {
      id: `user-${Date.now()}`,
      name,
      email,
      passwordHash,
      role,
      allowedSections: Array.isArray(allowedSections) ? allowedSections : undefined,
      isActive: true,
      createdAt: new Date().toISOString(),
    };

    users.push(newUser);
    writeCollection("admin-users", users);

    // AUDIT LOG
    createAuditLog({
      userId: auth.session?.userId,
      userName: auth.session?.email,
      userRole: auth.session?.role,
      action: "CREATE_USER",
      module: "users",
      recordId: newUser.id,
      updatedData: { email: newUser.email, role: newUser.role }
    });

    const { passwordHash: _omit, ...safe } = newUser;
    return NextResponse.json({ success: true, user: safe });
  } catch (err) {
    console.error("Create user error:", err);
    return NextResponse.json({ error: "Failed to create user." }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  // STRICT SUPER ADMIN CHECK FOR USER DELETION
  const auth = await requireSuperAdmin(request);
  if (auth.error) return auth.error;

  const { searchParams } = new URL(request.url);
  const id = searchParams.get("id");
  if (!id) return NextResponse.json({ error: "User ID required" }, { status: 400 });

  let users = readCollection<AdminUser>("admin-users");
  const target = users.find((u) => u.id === id);
  if (!target) return NextResponse.json({ error: "Not found" }, { status: 404 });

  // Prevent deleting the primary super admin
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
    previousData: { email: target.email, role: target.role }
  });

  return NextResponse.json({ success: true });
}
