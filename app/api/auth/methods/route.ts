import { NextResponse } from "next/server";
import { isSmtpConfigured } from "@/lib/email/service";
import { rateLimit } from "@/lib/security/rate-limit";

export const dynamic = "force-dynamic";

/**
 * Whether a sign-in code can actually be delivered right now, so the login page never invites a
 * shopper to wait for a code this server cannot send.
 *
 * In development it always says yes: with no SMTP server configured the code is printed to the
 * server log, which is what makes the flow testable locally.
 */
export async function GET(request: Request) {
  const limited = await rateLimit(request, "auth-methods", { windowMs: 60_000, maxRequests: 120, store: "memory" });
  if (limited) return limited;

  const available = process.env.NODE_ENV !== "production" || isSmtpConfigured();

  return NextResponse.json({ email: available }, { headers: { "Cache-Control": "no-store" } });
}
