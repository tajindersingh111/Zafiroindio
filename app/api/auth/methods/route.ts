import { NextResponse } from "next/server";
import { isWhatsAppOtpConfigured } from "@/lib/notifications/whatsapp";
import { isSmtpConfigured } from "@/lib/email/service";
import { rateLimit } from "@/lib/security/rate-limit";

export const dynamic = "force-dynamic";

/**
 * Which sign-in methods can actually deliver a code right now, so the login page only offers the
 * ones that work — a shopper is never invited to wait for a code this server cannot send.
 *
 * In development both are offered: with nothing configured the code is printed to the server log,
 * which is what makes the flow testable locally.
 */
export async function GET(request: Request) {
  const limited = await rateLimit(request, "auth-methods", { windowMs: 60_000, maxRequests: 120, store: "memory" });
  if (limited) return limited;

  const dev = process.env.NODE_ENV !== "production";
  const [whatsapp] = await Promise.all([isWhatsAppOtpConfigured().catch(() => false)]);

  return NextResponse.json({ whatsapp: dev || whatsapp, email: dev || isSmtpConfigured() }, { headers: { "Cache-Control": "no-store" } });
}
