import { NextRequest, NextResponse } from "next/server";
import { readCollection, writeCollection } from "@/lib/db/store";
import type { Product } from "@/lib/db/types";
import { v4 as uuidv4 } from "uuid";
import { requireSuperAdmin, getAuthSession } from "@/lib/auth/rbac";
import { createAuditLog } from "@/lib/db/audit";
import { evaluatePriceChange, evaluateInventoryChange } from "@/lib/db/anomalies";
import { moveToRecycleBin } from "@/lib/db/recycle-bin";

export async function GET(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const products = readCollection<Product>("products");
  const product = products.find((p) => p.id === id);
  if (!product) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json({ product });
}

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getAuthSession(request);
  const { id } = await params;
  const body = await request.json() as Partial<Product> & { adjustmentReason?: string };
  const products = readCollection<Product>("products");
  const idx = products.findIndex((p) => p.id === id);
  if (idx < 0) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const oldProduct = products[idx];

  // Price Anomaly Check
  if (body.price !== undefined && body.price !== oldProduct.price) {
    evaluatePriceChange(id, oldProduct.name, oldProduct.price, body.price, {
      id: session?.userId,
      email: session?.email,
      role: session?.role
    });
  }

  // Inventory Anomaly Check
  if (body.stock !== undefined && body.stock !== oldProduct.stock) {
    evaluateInventoryChange(id, oldProduct.name, oldProduct.stock, body.stock, body.adjustmentReason, {
      id: session?.userId,
      email: session?.email,
      role: session?.role
    });
  }

  // Cost History Check
  const newCostPrice = body.costPrice ?? (body.costBreakdown ? Object.values(body.costBreakdown).reduce((a, b) => a + (Number(b) || 0), 0) : undefined);
  if (newCostPrice !== undefined && newCostPrice !== (oldProduct.costPrice || 0)) {
    const recordCostHistory = require("@/lib/db/cost-history").recordCostHistory;
    recordCostHistory({
      productId: id,
      productName: oldProduct.name,
      previousCost: oldProduct.costPrice || 0,
      newCost: newCostPrice,
      changedBy: session?.email || "Admin User",
      reason: body.adjustmentReason || "Product cost updated via admin"
    });
    body.costPrice = newCostPrice;
  }

  products[idx] = { ...products[idx], ...body, id, updatedAt: new Date().toISOString() };
  writeCollection("products", products);

  return NextResponse.json({ product: products[idx] });
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  // STRICT SUPER ADMIN DELETE CHECK
  const auth = await requireSuperAdmin(request);
  if (auth.error) return auth.error;

  const { id } = await params;
  let products = readCollection<Product>("products");
  const target = products.find((p) => p.id === id);
  if (!target) return NextResponse.json({ error: "Not found" }, { status: 404 });

  // Move to Recycle Bin before removing from active products list
  moveToRecycleBin({
    module: "products",
    originalId: id,
    recordName: target.name,
    data: target,
    deletedBy: auth.session?.email || "Super Admin",
    deletedByRole: auth.session?.role || "super_admin",
    reason: "Super Admin single product deletion"
  });

  products = products.filter((p) => p.id !== id);
  writeCollection("products", products);

  return NextResponse.json({ success: true, message: "Product moved to Recycle Bin." });
}

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const products = readCollection<Product>("products");
  const original = products.find((p) => p.id === id);
  if (!original) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const now = new Date().toISOString();
  const duplicate: Product = {
    ...original,
    id: uuidv4(),
    name: `${original.name} (Copy)`,
    slug: `${original.slug}-copy-${Date.now()}`,
    sku: `${original.sku}-COPY`,
    status: "draft",
    createdAt: now,
    updatedAt: now,
  };
  products.push(duplicate);
  writeCollection("products", products);
  return NextResponse.json({ product: duplicate }, { status: 201 });
}
