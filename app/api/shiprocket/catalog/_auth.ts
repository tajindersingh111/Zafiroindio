import { NextRequest, NextResponse } from "next/server";
import { shiprocketCheckoutClient } from "@/lib/shiprocket-checkout/client";

export function siteOrigin(request: NextRequest): string {
  return (process.env.NEXT_PUBLIC_SITE_URL || request.nextUrl.origin).replace(/\/$/, "");
}

/** Only Shiprocket (holding our API secret) may pull the catalogue. Fails closed. */
export function authorizeCatalogRequest(request: NextRequest): NextResponse | null {
  const url = request.nextUrl;
  const ok = shiprocketCheckoutClient.verifySignature("", request.headers, [url.pathname + url.search, url.search.replace(/^\?/, ""), url.toString()]);
  return ok ? null : NextResponse.json({ error: "Unauthorized" }, { status: 401 });
}

export function pageParams(request: NextRequest) {
  const sp = request.nextUrl.searchParams;
  const page = Math.max(1, Number(sp.get("page") || 1) || 1);
  const limit = Math.min(250, Math.max(1, Number(sp.get("limit") || 100) || 100));
  return { page, limit };
}
