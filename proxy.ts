import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { parseSessionString, SESSION_COOKIE_NAME } from "@/lib/auth/token";
import { canAccessSection, sectionForPath } from "@/lib/auth/access";

/**
 * Optimistic first gate for /admin pages and /api/admin routes (signature, expiry, role->section).
 * It is NOT the security boundary: every admin route handler re-checks the session against the
 * database via lib/auth/guard.ts (revocation, deactivated users, current role).
 */
export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Shiprocket's checkout SDK (Shopify flavour) probes Shopify JSON endpoints on every product page
  // (/products/<slug>.js|.json, /cart.js|.json). We are not Shopify: answer instantly instead of
  // rendering a product-page 404 for each probe.
  if (!pathname.startsWith("/admin") && !pathname.startsWith("/api/")) {
    return NextResponse.json({ error: "Not found" }, { status: 404, headers: { "Cache-Control": "public, max-age=3600" } });
  }

  const isApi = pathname.startsWith("/api/");

  const requestHeaders = new Headers(request.headers);
  requestHeaders.set("x-pathname", pathname);
  const next = () => NextResponse.next({ request: { headers: requestHeaders } });

  // Public admin entry points.
  if (pathname === "/api/admin/auth/login" || pathname === "/api/admin/auth/logout") return next();

  const session = parseSessionString(request.cookies.get(SESSION_COOKIE_NAME)?.value);

  if (pathname === "/admin/login") {
    return session ? NextResponse.redirect(new URL("/admin", request.url)) : next();
  }

  if (!session) {
    if (isApi) return NextResponse.json({ error: "Unauthorized. Authentication required." }, { status: 401 });
    const loginUrl = new URL("/admin/login", request.url);
    loginUrl.searchParams.set("from", pathname);
    const response = NextResponse.redirect(loginUrl);
    if (request.cookies.has(SESSION_COOKIE_NAME)) response.cookies.delete(SESSION_COOKIE_NAME);
    return response;
  }

  if (!canAccessSection(session.role, session.allowedSections, sectionForPath(pathname))) {
    if (isApi) return NextResponse.json({ error: "Forbidden. Insufficient role permissions." }, { status: 403 });
    return NextResponse.redirect(new URL("/admin?error=unauthorized", request.url));
  }

  return next();
}

export const config = {
  matcher: ["/admin/:path*", "/api/admin/:path*", "/products/:slug([^/]+\\.(?:js|json))", "/cart.js", "/cart.json"],
};
