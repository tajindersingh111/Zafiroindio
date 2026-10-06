import { NextRequest, NextResponse } from "next/server";
import { readCollection } from "@/lib/db/store";
import { authorizeCatalogRequest, pageParams, siteOrigin } from "../_auth";

export const dynamic = "force-dynamic";

type Col = { id?: string; name: string; slug: string; desc?: string; image?: string };

// GET /api/shiprocket/catalog/collections
export async function GET(request: NextRequest) {
  const denied = authorizeCatalogRequest(request);
  if (denied) return denied;

  const { page, limit } = pageParams(request);
  const all = await readCollection<Col>("collections");
  const origin = siteOrigin(request);
  const collections = all.slice((page - 1) * limit, page * limit).map((c) => ({
    id: c.id || c.slug,
    title: c.name,
    handle: c.slug,
    body_html: c.desc || "",
    image: c.image ? { src: /^https?:/.test(c.image) ? c.image : `${origin}${c.image}` } : null,
    updated_at: new Date().toISOString(),
  }));
  return NextResponse.json({ data: { total: all.length, page, limit, collections } });
}
