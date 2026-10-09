import { NextRequest, NextResponse } from "next/server";
import { loadActiveProducts, loadCollections, productsInCollection, toSrProducts } from "@/lib/shiprocket/catalog";
import { resolveCollectionNumber } from "@/lib/shiprocket/variants";
import { CATALOG_HEADERS, guardCatalogRequest, pageParams, siteOrigin } from "../../../_auth";

export const dynamic = "force-dynamic";

// GET /api/shiprocket/catalog/collections/:id/products  (:id = numeric Shiprocket id, our id, or slug)
export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const denied = await guardCatalogRequest(request);
  if (denied) return denied;

  const { id } = await params;
  const slug = /^\d+$/.test(id) ? await resolveCollectionNumber(id) : null;
  const cols = await loadCollections();
  const col = cols.find((c) => c.slug === (slug ?? id) || c.id === id) ?? { slug: slug ?? id };

  const { page, limit } = pageParams(request);
  const all = productsInCollection(await loadActiveProducts(), col);
  const products = await toSrProducts(all.slice((page - 1) * limit, page * limit), siteOrigin(request));
  return NextResponse.json({ success: true, data: { total: all.length, page, limit, products } }, { headers: CATALOG_HEADERS });
}
