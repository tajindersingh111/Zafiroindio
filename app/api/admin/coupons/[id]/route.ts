import { NextResponse } from "next/server";
import { readCollection, writeCollection } from "@/lib/db/store";
import type { Coupon } from "@/lib/db/types";

export async function GET(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const coupons = readCollection<Coupon>("coupons");
  const coupon = coupons.find((c) => c.id === id);
  if (!coupon) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json({ coupon });
}

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = await request.json() as Partial<Coupon>;
  const coupons = readCollection<Coupon>("coupons");
  const idx = coupons.findIndex((c) => c.id === id);
  if (idx < 0) return NextResponse.json({ error: "Not found" }, { status: 404 });

  coupons[idx] = { ...coupons[idx], ...body, id, updatedAt: new Date().toISOString() };
  writeCollection("coupons", coupons);
  return NextResponse.json({ coupon: coupons[idx] });
}

export async function DELETE(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  let coupons = readCollection<Coupon>("coupons");
  if (!coupons.some((c) => c.id === id)) return NextResponse.json({ error: "Not found" }, { status: 404 });
  coupons = coupons.filter((c) => c.id !== id);
  writeCollection("coupons", coupons);
  return NextResponse.json({ success: true });
}
