import { NextResponse } from "next/server";
import { readCollection, writeCollection } from "@/lib/db/store";
import type { Coupon } from "@/lib/db/types";
import { v4 as uuidv4 } from "uuid";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const search = searchParams.get("search")?.toLowerCase() ?? "";
  const isActive = searchParams.get("isActive");
  const page = parseInt(searchParams.get("page") ?? "1");
  const pageSize = parseInt(searchParams.get("pageSize") ?? "20");

  let coupons = readCollection<Coupon>("coupons");

  if (search) coupons = coupons.filter((c) => c.code.toLowerCase().includes(search));
  if (isActive !== null && isActive !== "") coupons = coupons.filter((c) => String(c.isActive) === isActive);

  const total = coupons.length;
  const start = (page - 1) * pageSize;
  const paginated = coupons.slice(start, start + pageSize);

  return NextResponse.json({ coupons: paginated, total, page, pageSize, totalPages: Math.ceil(total / pageSize) });
}

export async function POST(request: Request) {
  try {
    const body = await request.json() as Partial<Coupon>;
    const coupons = readCollection<Coupon>("coupons");

    if (coupons.some((c) => c.code.toUpperCase() === (body.code ?? "").toUpperCase())) {
      return NextResponse.json({ error: "Coupon code already exists." }, { status: 400 });
    }

    const now = new Date().toISOString();
    const newCoupon: Coupon = {
      id: uuidv4(),
      code: (body.code ?? "").toUpperCase(),
      type: body.type ?? "fixed_cart",
      amount: body.amount ?? 0,
      minimumSpend: body.minimumSpend,
      maximumSpend: body.maximumSpend,
      usageLimit: body.usageLimit,
      usageLimitPerCustomer: body.usageLimitPerCustomer,
      usageCount: 0,
      startDate: body.startDate,
      expiryDate: body.expiryDate,
      applicableProductIds: body.applicableProductIds ?? [],
      applicableCategoryIds: body.applicableCategoryIds ?? [],
      excludedProductIds: body.excludedProductIds ?? [],
      excludedCategoryIds: body.excludedCategoryIds ?? [],
      isActive: body.isActive ?? true,
      createdAt: now,
      updatedAt: now,
    };

    coupons.push(newCoupon);
    writeCollection("coupons", coupons);
    return NextResponse.json({ coupon: newCoupon }, { status: 201 });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Failed to create coupon." }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  const { requireSuperAdmin } = require("@/lib/auth/rbac");
  const { createAuditLog } = require("@/lib/db/audit");
  
  const auth = await requireSuperAdmin(request as any);
  if (auth.error) return auth.error;

  const { searchParams } = new URL(request.url);
  const id = searchParams.get("id");
  if (!id) return NextResponse.json({ error: "Coupon ID required" }, { status: 400 });

  let coupons = readCollection<Coupon>("coupons");
  const target = coupons.find((c) => c.id === id);
  if (!target) return NextResponse.json({ error: "Not found" }, { status: 404 });

  coupons = coupons.filter((c) => c.id !== id);
  writeCollection("coupons", coupons);

  createAuditLog({
    userId: auth.session?.userId,
    userName: auth.session?.email,
    userRole: auth.session?.role,
    action: "DELETE_COUPON",
    module: "coupons",
    recordId: id,
    previousData: target
  });

  return NextResponse.json({ success: true });
}

