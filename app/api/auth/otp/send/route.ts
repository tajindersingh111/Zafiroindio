import { NextResponse } from "next/server";
import { issueEmailOtp, OTP_RESEND_COOLDOWN_MS } from "@/lib/auth/otp";
import { isSmtpConfigured, sendLoginOtpEmail } from "@/lib/email/service";
import { checkRateLimit, rateLimitResponse } from "@/lib/security/rate-limit";
import { getClientIp } from "@/lib/security/client-ip";
import { normalizeEmail } from "@/lib/orders/contact";
import { isSameOrigin } from "@/lib/auth/customer";

export const dynamic = "force-dynamic";

const COOLDOWN_SECONDS = Math.floor(OTP_RESEND_COOLDOWN_MS / 1000);

/**
 * Sends a sign-in code by e-mail.
 *
 * A send can be aimed at a stranger's inbox, so it is limited three ways: per IP (a script cannot
 * flood an address), per address (lib/auth/otp.ts: a 60s cooldown and 3 per hour), and by refusing
 * to create a code at all when there is no way to deliver it.
 *
 * The response never says whether the address already belongs to a customer — that would turn this
 * endpoint into a "is this person a customer here" oracle.
 */
export async function POST(request: Request) {
  if (!isSameOrigin(request)) return NextResponse.json({ error: "Cross-site request blocked." }, { status: 403 });

  const ip = getClientIp(request);
  // Mobile carriers put many shoppers behind one IP (CGNAT), so this is generous but still finite.
  const ipLimit = await checkRateLimit(`otp-send:ip:${ip}`, { windowMs: 60 * 60_000, maxRequests: 20 });
  if (!ipLimit.success) return rateLimitResponse(ipLimit.reset);

  let body: { email?: unknown };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }

  const rawEmail = typeof body.email === "string" ? body.email : "";
  if (rawEmail.length > 254) return NextResponse.json({ error: "Enter a valid e-mail address." }, { status: 400 });
  const email = normalizeEmail(rawEmail);

  // Second limiter keyed on the address itself, so rotating IPs cannot be used to flood one inbox.
  const emailLimit = await checkRateLimit(`otp-send:email:${email}`, { windowMs: 60 * 60_000, maxRequests: 5 });
  if (!emailLimit.success) return rateLimitResponse(emailLimit.reset);

  // Refuse before creating a code when this server has no way to deliver one in production.
  if (process.env.NODE_ENV === "production" && !isSmtpConfigured()) {
    return NextResponse.json({ error: "Sign-in is temporarily unavailable. Please try again later." }, { status: 503 });
  }

  const issued = await issueEmailOtp(rawEmail);
  if (!issued.ok) {
    const status = issued.reason === "invalid_email" ? 400 : 429;
    return NextResponse.json({ error: issued.message, retryAfterSeconds: issued.retryAfterSeconds }, { status });
  }

  const sent = await sendLoginOtpEmail(issued.email, issued.code);

  if (!sent.ok) {
    // In development there is usually no SMTP server configured: print the code to the server log
    // so the flow can be tested. Never in production — that would put codes in hosting logs.
    if (process.env.NODE_ENV !== "production") {
      console.warn(`[otp] E-mail unavailable (${sent.error}). Code for ${issued.email} is ${issued.code}`);
      return NextResponse.json({
        success: true,
        cooldownSeconds: COOLDOWN_SECONDS,
        expiresInSeconds: issued.expiresInSeconds,
        devNotice: "SMTP is not configured. The code was printed to the server log.",
      });
    }
    console.error("[otp] delivery failed:", sent.error);
    return NextResponse.json({ error: "We could not send the code right now. Please try again in a moment." }, { status: 502 });
  }

  return NextResponse.json({ success: true, cooldownSeconds: COOLDOWN_SECONDS, expiresInSeconds: issued.expiresInSeconds });
}
