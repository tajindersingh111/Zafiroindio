import { NextRequest, NextResponse } from "next/server";
import { rateLimit } from "@/lib/security/rate-limit";

export function siteOrigin(request: NextRequest): string {
  return (process.env.NEXT_PUBLIC_SITE_URL || request.nextUrl.origin).replace(/\/$/, "");
}

/**
 * The catalogue feed is the same public information the storefront shows (names, prices, stock), so
 * it is open to Shiprocket's sync without a signature: an HMAC requirement that Shiprocket's
 * catalogue calls don't meet would silently empty its catalogue and break checkout. It is rate
 * limited and served from cache; prices are still re-checked server-side when a checkout starts.
 */
export async function guardCatalogRequest(request: NextRequest): Promise<NextResponse | null> {
  return rateLimit(request, "sr-catalog", { windowMs: 60_000, maxRequests: 240, store: "memory" });
}

export function pageParams(request: NextRequest) {
  const sp = request.nextUrl.searchParams;
  const page = Math.max(1, Number(sp.get("page") || 1) || 1);
  const limit = Math.min(250, Math.max(1, Number(sp.get("limit") || 100) || 100));
  return { page, limit };
}

export const CATALOG_HEADERS = { "Cache-Control": "public, max-age=60, s-maxage=60" };
