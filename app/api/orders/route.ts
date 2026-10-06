import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth/guard";
import { prisma } from "@/lib/db/prisma";
import type { Order } from "@/lib/db/types";

export const dynamic = "force-dynamic";

// GET /api/orders - paginated order list for authorised staff only.
export async function GET(request: NextRequest) {
  const auth = await requireAdmin(request, "orders");
  if (auth.error) return auth.error;

  const sp = request.nextUrl.searchParams;
  const status = sp.get("status");
  const limit = Math.min(100, Math.max(1, Number(sp.get("limit") || 50) || 50));
  const page = Math.max(1, Number(sp.get("page") || 1) || 1);

  const where = { collection: "orders", ...(status ? { data: { path: ["status"], equals: status } } : {}) };
  const [rows, total] = await Promise.all([
    prisma.document.findMany({ where, orderBy: [{ position: "asc" }, { createdAt: "desc" }], skip: (page - 1) * limit, take: limit, select: { data: true } }),
    prisma.document.count({ where }),
  ]);

  return NextResponse.json({
    success: true,
    orders: rows.map((r) => r.data as unknown as Order),
    pagination: { total, page, limit, totalPages: Math.ceil(total / limit) },
  });
}

// Orders are created ONLY by the signature-verified Shiprocket Checkout webhook.
export async function POST() {
  return NextResponse.json({ error: "Orders are placed through Shiprocket Checkout." }, { status: 405 });
}
