import { NextRequest, NextResponse } from "next/server";
import { readCollection, writeCollection } from "@/lib/db/store";
import type { Customer } from "@/lib/db/types";
import { requireSuperAdmin } from "@/lib/auth/rbac";
import { createAuditLog } from "@/lib/db/audit";

export async function GET(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const customers = readCollection<Customer>("customers");
  const customer = customers.find((c) => c.id === id);
  if (!customer) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json({ customer });
}

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = await request.json() as Partial<Customer>;
  const customers = readCollection<Customer>("customers");
  const idx = customers.findIndex((c) => c.id === id);
  if (idx < 0) return NextResponse.json({ error: "Not found" }, { status: 404 });

  customers[idx] = { ...customers[idx], ...body, id, updatedAt: new Date().toISOString() };
  writeCollection("customers", customers);
  return NextResponse.json({ customer: customers[idx] });
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  // STRICT SUPER ADMIN DELETE CHECK
  const auth = await requireSuperAdmin(request);
  if (auth.error) return auth.error;

  const { id } = await params;
  let customers = readCollection<Customer>("customers");
  const target = customers.find((c) => c.id === id);
  if (!target) return NextResponse.json({ error: "Not found" }, { status: 404 });

  customers = customers.filter((c) => c.id !== id);
  writeCollection("customers", customers);

  // AUDIT LOG
  createAuditLog({
    userId: auth.session?.userId,
    userName: auth.session?.email,
    userRole: auth.session?.role,
    action: "DELETE_CUSTOMER",
    module: "customers",
    recordId: id,
    previousData: target
  });

  return NextResponse.json({ success: true, message: "Customer permanently deleted by Super Admin." });
}
