import { NextRequest, NextResponse } from "next/server";
import { readCollection, writeCollection } from "@/lib/db/store";
import type { Product } from "@/lib/db/types";
import { v4 as uuidv4 } from "uuid";
import { requireSuperAdmin } from "@/lib/auth/rbac";
import { createAuditLog } from "@/lib/db/audit";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const search = searchParams.get("search")?.toLowerCase() ?? "";
  const category = searchParams.get("category") ?? "";
  const status = searchParams.get("status") ?? "";
  const stockStatus = searchParams.get("stock") ?? "";
  const page = parseInt(searchParams.get("page") ?? "1");
  const pageSize = parseInt(searchParams.get("pageSize") ?? "20");

  let products = readCollection<Product>("products");

  if (search) {
    products = products.filter(
      (p) =>
        p.name.toLowerCase().includes(search) ||
        p.sku.toLowerCase().includes(search) ||
        p.tags.some((t) => t.toLowerCase().includes(search))
    );
  }
  if (category) products = products.filter((p) => p.categoryId === category);
  if (status) products = products.filter((p) => p.status === status);
  if (stockStatus) products = products.filter((p) => p.stockStatus === stockStatus);

  const total = products.length;
  const start = (page - 1) * pageSize;
  const paginated = products.slice(start, start + pageSize);

  return NextResponse.json({ products: paginated, total, page, pageSize, totalPages: Math.ceil(total / pageSize) });
}

export async function POST(request: Request) {
  try {
    const body = await request.json() as Partial<Product>;
    const products = readCollection<Product>("products");

    if (body.sku && products.some((p) => p.sku === body.sku)) {
      return NextResponse.json({ error: "SKU already exists." }, { status: 400 });
    }

    const now = new Date().toISOString();
    const newProduct: Product = {
      id: uuidv4(),
      name: body.name ?? "",
      slug: (body.slug ?? body.name ?? "").toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, ""),
      type: body.type ?? "simple",
      status: body.status ?? "draft",
      description: body.description ?? "",
      shortDescription: body.shortDescription ?? "",
      sku: body.sku ?? "",
      price: body.price ?? 0,
      salePrice: body.salePrice,
      mrp: body.mrp,
      costPrice: body.costPrice ?? (body.costBreakdown ? Object.values(body.costBreakdown).reduce((a, b) => a + (Number(b) || 0), 0) : 0),
      costBreakdown: body.costBreakdown,
      categoryId: body.categoryId ?? "",
      subcategoryId: body.subcategoryId,
      brandId: body.brandId,
      tags: body.tags ?? [],
      images: body.images ?? [],
      weight: body.weight,
      dimensions: body.dimensions,
      taxClass: body.taxClass ?? "standard",
      stock: body.stock ?? 0,
      stockStatus: body.stockStatus ?? "in_stock",
      lowStockThreshold: body.lowStockThreshold ?? 10,
      manageStock: body.manageStock ?? true,
      backordersAllowed: body.backordersAllowed ?? false,
      codAllowed: body.codAllowed ?? true,
      codShippingCharge: body.codShippingCharge,
      freeShipping: body.freeShipping ?? false,
      attributes: body.attributes ?? {},
      variations: body.variations ?? [],
      createdAt: now,
      updatedAt: now,
    };

    products.push(newProduct);
    writeCollection("products", products);

    return NextResponse.json({ product: newProduct }, { status: 201 });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Failed to create product." }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  // STRICT SUPER ADMIN CHECK
  const auth = await requireSuperAdmin(request);
  if (auth.error) return auth.error;

  const { searchParams } = new URL(request.url);
  const ids = searchParams.get("ids")?.split(",") ?? [];
  if (!ids.length) return NextResponse.json({ error: "No IDs provided." }, { status: 400 });

  let products = readCollection<Product>("products");
  const previous = products.filter((p) => ids.includes(p.id));
  products = products.filter((p) => !ids.includes(p.id));
  writeCollection("products", products);

  // AUDIT LOG
  createAuditLog({
    userId: auth.session?.userId,
    userName: auth.session?.email,
    userRole: auth.session?.role,
    action: "DELETE_PRODUCTS_BULK",
    module: "products",
    recordId: ids.join(", "),
    previousData: previous
  });

  return NextResponse.json({ success: true, deleted: ids.length });
}
