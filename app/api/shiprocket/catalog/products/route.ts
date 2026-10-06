import { NextRequest, NextResponse } from "next/server";
import { loadActiveProducts, toSrProduct } from "@/lib/shiprocket/catalog";
import { authorizeCatalogRequest, pageParams, siteOrigin } from "../_auth";

export const dynamic = "force-dynamic";

// GET /api/shiprocket/catalog/products?page=1&limit=100
export async function GET(request: NextRequest) {
  const denied = authorizeCatalogRequest(request);
  if (denied) return denied;

  const { page, limit } = pageParams(request);
  const all = await loadActiveProducts();
  const slice = all.slice((page - 1) * limit, page * limit);
  const origin = siteOrigin(request);
  const products = await Promise.all(slice.map((p) => toSrProduct(p, origin)));
  return NextResponse.json({ data: { total: all.length, page, limit, products } });
}
