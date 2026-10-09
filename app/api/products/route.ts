import { gzipSync } from "node:zlib";
import { NextRequest, NextResponse } from "next/server";
import { cached } from "@/lib/cache";
import { getCatalogProducts } from "@/lib/storefront/catalog";

export const dynamic = "force-dynamic";

/** Plain-text snippet: enough for listing search, a fraction of the full HTML description. */
const snippet = (html: string) => html.replace(/<[^>]*>/g, " ").replace(/\\n|\s+/g, " ").trim().slice(0, 300);

const CACHE_HEADERS = { "Cache-Control": "public, max-age=60, s-maxage=60, stale-while-revalidate=300", Vary: "Accept-Encoding" };

// Catalogue for client components (shop, search, wishlist, recommendations). The JSON (and its gzip,
// which route handlers don't get automatically) is built once per catalogue refresh and cleared with
// the rest of the catalogue on admin edits; browsers/CDNs may reuse it for a minute.
export async function GET(request: NextRequest) {
  try {
    const { json, gz } = await cached("catalog:api-products", 60_000, async () => {
      const json = JSON.stringify({ products: (await getCatalogProducts()).map((p) => ({ ...p, description: snippet(p.description) })) });
      return { json, gz: gzipSync(json) };
    });
    if (/\bgzip\b/.test(request.headers.get("accept-encoding") || "")) {
      return new NextResponse(new Uint8Array(gz), { headers: { "Content-Type": "application/json", "Content-Encoding": "gzip", ...CACHE_HEADERS } });
    }
    return new NextResponse(json, { headers: { "Content-Type": "application/json", ...CACHE_HEADERS } });
  } catch (error) {
    console.error("GET /api/products failed:", error);
    return NextResponse.json({ products: [] }, { status: 503, headers: { "Cache-Control": "no-store", "Retry-After": "10" } });
  }
}
