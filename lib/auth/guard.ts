import { NextRequest, NextResponse } from "next/server";
import { getAuthSession, unauthorizedResponse, forbiddenResponse } from "@/lib/auth/rbac";
import { canAccessSection, sectionForPath, type Section } from "@/lib/auth/access";
import type { AdminSession } from "@/lib/auth/session";

type RouteContext = { params: Promise<Record<string, string>> };
type Handler = (request: any, context?: any) => Promise<Response> | Response;

const SAFE_METHODS = new Set(["GET", "HEAD", "OPTIONS"]);

/** Reject cross-site state-changing requests (CSRF defence in depth on top of SameSite=Lax). */
function isSameOrigin(request: Request): boolean {
  const origin = request.headers.get("origin");
  if (!origin) return true; // non-browser clients / same-origin GET-style fetches send none
  const host = request.headers.get("x-forwarded-host") || request.headers.get("host");
  try {
    return !!host && new URL(origin).host === host;
  } catch {
    return false;
  }
}

/**
 * Authoritative admin authorization. Checks (in order) same-origin, valid live session and
 * that the user's role may touch the section that owns this URL (lib/auth/access.ts).
 */
export async function requireAdmin(
  request: NextRequest | Request,
  /** Section that owns this endpoint when it does not live under /api/admin. */
  section?: Section
): Promise<{ session: AdminSession; error: null } | { session: null; error: NextResponse }> {
  if (!SAFE_METHODS.has(request.method) && !isSameOrigin(request)) {
    return { session: null, error: forbiddenResponse("Cross-site request blocked.") };
  }
  const session = await getAuthSession(request);
  if (!session) return { session: null, error: unauthorizedResponse("Unauthorized. Authentication required.") };

  const pathname = new URL(request.url).pathname;
  if (!canAccessSection(session.role, session.allowedSections, section ?? sectionForPath(pathname))) {
    return { session: null, error: forbiddenResponse("Forbidden. Insufficient role permissions.") };
  }
  return { session, error: null };
}

/** Wrap a route-handler so it only runs for an authorized admin. */
export function guarded<H extends Handler>(handler: H, section?: Section): H {
  const wrapped = async (request: NextRequest, context?: RouteContext) => {
    const auth = await requireAdmin(request, section);
    if (auth.error) return auth.error;
    return handler(request, context);
  };
  return wrapped as unknown as H;
}
