import { NextRequest, NextResponse } from "next/server";
import { loadActiveProducts, toSrProducts } from "@/lib/shiprocket/catalog";
import { CATALOG_HEADERS, guardCatalogRequest, pageParams, siteOrigin } from "../_auth";

export const dynamic = "force-dynamic";

// GET /api/shiprocket/catalog/products?page=1&limit=100
export async function GET(request: NextRequest) {
  const denied = await guardCatalogRequest(request);
  if (denied) return denied;

  const { page, limit } = pageParams(request);
  const all = await loadActiveProducts();
  const products = await toSrProducts(all.slice((page - 1) * limit, page * limit), siteOrigin(request));
  return NextResponse.json({ success: true, data: { total: all.length, page, limit, products } }, { headers: CATALOG_HEADERS });
}
