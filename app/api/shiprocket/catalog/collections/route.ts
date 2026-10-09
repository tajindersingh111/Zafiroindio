import { NextRequest, NextResponse } from "next/server";
import { loadCollections, toSrCollections } from "@/lib/shiprocket/catalog";
import { CATALOG_HEADERS, guardCatalogRequest, pageParams, siteOrigin } from "../_auth";

export const dynamic = "force-dynamic";

// GET /api/shiprocket/catalog/collections?page=1&limit=100
export async function GET(request: NextRequest) {
  const denied = await guardCatalogRequest(request);
  if (denied) return denied;

  const { page, limit } = pageParams(request);
  const all = await loadCollections();
  const collections = await toSrCollections(all.slice((page - 1) * limit, page * limit), siteOrigin(request));
  return NextResponse.json({ success: true, data: { total: all.length, page, limit, collections } }, { headers: CATALOG_HEADERS });
}
