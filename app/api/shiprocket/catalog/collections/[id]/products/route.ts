import { NextRequest, NextResponse } from "next/server";
import { readCollection } from "@/lib/db/store";
import { loadActiveProducts, toSrProduct } from "@/lib/shiprocket/catalog";
import { authorizeCatalogRequest, pageParams, siteOrigin } from "../../../_auth";

export const dynamic = "force-dynamic";

type Col = { id?: string; slug: string };

// GET /api/shiprocket/catalog/collections/:id/products
export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const denied = authorizeCatalogRequest(request);
  if (denied) return denied;

  const { id } = await params;
  const cols = await readCollection<Col>("collections");
  const col = cols.find((c) => c.id === id || c.slug === id);
  const slug = col?.slug ?? id;

  const { page, limit } = pageParams(request);
  const all = (await loadActiveProducts()).filter((p) => p.collections?.includes(slug) || p.collections?.includes(col?.id ?? "") || p.categoryId === slug);
  const origin = siteOrigin(request);
  const products = await Promise.all(all.slice((page - 1) * limit, page * limit).map((p) => toSrProduct(p, origin)));
  return NextResponse.json({ data: { total: all.length, page, limit, products } });
}
