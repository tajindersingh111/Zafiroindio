import { NextResponse } from "next/server";
import { issueEmailOtp, issueOtp, OTP_RESEND_COOLDOWN_MS } from "@/lib/auth/otp";
import { sendLoginOtpWhatsApp } from "@/lib/notifications/whatsapp";
import { isSmtpConfigured, sendLoginOtpEmail } from "@/lib/email/service";
import { checkRateLimit, rateLimitResponse } from "@/lib/security/rate-limit";
import { getClientIp } from "@/lib/security/client-ip";
import { normalizeEmail, normalizePhone } from "@/lib/orders/contact";
import { isSameOrigin } from "@/lib/auth/customer";

export const dynamic = "force-dynamic";

const COOLDOWN_SECONDS = Math.floor(OTP_RESEND_COOLDOWN_MS / 1000);

/**
 * Sends a sign-in code, by WhatsApp (default) or e-mail (`channel: "email"`).
 *
 * A WhatsApp send costs money (Meta bills per authentication message) and an e-mail send can be
 * aimed at a stranger's inbox, so both are limited three ways: per IP (a script cannot run up the
 * bill or flood an address), per recipient (lib/auth/otp.ts: a 60s cooldown and 3 per hour), and by
 * refusing to create a code at all when the channel cannot deliver it.
 *
 * The response never says whether the number or address already belongs to a customer — that would
 * turn this endpoint into a "is this person a customer here" oracle.
 */
export async function POST(request: Request) {
  if (!isSameOrigin(request)) return NextResponse.json({ error: "Cross-site request blocked." }, { status: 403 });

  const ip = getClientIp(request);
  // Mobile carriers put many shoppers behind one IP (CGNAT), so this is generous but still finite.
  const ipLimit = await checkRateLimit(`otp-send:ip:${ip}`, { windowMs: 60 * 60_000, maxRequests: 20 });
  if (!ipLimit.success) return rateLimitResponse(ipLimit.reset);

  let body: { channel?: unknown; phone?: unknown; email?: unknown };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }

  return body.channel === "email" ? sendByEmail(body.email) : sendByWhatsApp(body.phone);
}

async function sendByWhatsApp(rawValue: unknown): Promise<NextResponse> {
  const rawPhone = typeof rawValue === "string" ? rawValue : "";
  if (rawPhone.length > 20) return NextResponse.json({ error: "Enter a valid 10-digit Indian mobile number." }, { status: 400 });
  const phone = normalizePhone(rawPhone);

  // Second limiter keyed on the number itself, so rotating IPs cannot bypass the per-phone cap.
  const phoneLimit = await checkRateLimit(`otp-send:phone:${phone}`, { windowMs: 60 * 60_000, maxRequests: 5 });
  if (!phoneLimit.success) return rateLimitResponse(phoneLimit.reset);

  const issued = await issueOtp(rawPhone);
  if (!issued.ok) {
    const status = issued.reason === "invalid_phone" ? 400 : 429;
    return NextResponse.json({ error: issued.message, retryAfterSeconds: issued.retryAfterSeconds }, { status });
  }

  const sent = await sendLoginOtpWhatsApp(issued.phone, issued.code);

  if (!sent.ok) {
    // In development there is usually no WhatsApp account configured: print the code to the server
    // log so the flow can be tested. Never in production — that would put codes in hosting logs.
    if (process.env.NODE_ENV !== "production") {
      console.warn(`[otp] WhatsApp unavailable (${sent.error}). Code for ${issued.phone} is ${issued.code}`);
      return NextResponse.json({
        success: true,
        cooldownSeconds: COOLDOWN_SECONDS,
        expiresInSeconds: issued.expiresInSeconds,
        devNotice: "WhatsApp is not configured. The code was printed to the server log.",
      });
    }
    console.error("[otp] delivery failed:", sent.error);
    return NextResponse.json({ error: "We could not send the code right now. Please try again in a moment." }, { status: 502 });
  }

  return NextResponse.json({ success: true, cooldownSeconds: COOLDOWN_SECONDS, expiresInSeconds: issued.expiresInSeconds });
}

async function sendByEmail(rawValue: unknown): Promise<NextResponse> {
  const rawEmail = typeof rawValue === "string" ? rawValue : "";
  if (rawEmail.length > 254) return NextResponse.json({ error: "Enter a valid e-mail address." }, { status: 400 });
  const email = normalizeEmail(rawEmail);

  // Second limiter keyed on the address itself, so rotating IPs cannot be used to flood one inbox.
  const emailLimit = await checkRateLimit(`otp-send:email:${email}`, { windowMs: 60 * 60_000, maxRequests: 5 });
  if (!emailLimit.success) return rateLimitResponse(emailLimit.reset);

  // Refuse before creating a code when this server has no way to deliver one in production.
  if (process.env.NODE_ENV === "production" && !isSmtpConfigured()) {
    return NextResponse.json({ error: "E-mail sign-in is not available right now. Please try another way." }, { status: 503 });
  }

  const issued = await issueEmailOtp(rawEmail);
  if (!issued.ok) {
    const status = issued.reason === "invalid_email" ? 400 : 429;
    return NextResponse.json({ error: issued.message, retryAfterSeconds: issued.retryAfterSeconds }, { status });
  }

  const sent = await sendLoginOtpEmail(issued.email, issued.code);

  if (!sent.ok) {
    if (process.env.NODE_ENV !== "production") {
      console.warn(`[otp] E-mail unavailable (${sent.error}). Code for ${issued.email} is ${issued.code}`);
      return NextResponse.json({
        success: true,
        cooldownSeconds: COOLDOWN_SECONDS,
        expiresInSeconds: issued.expiresInSeconds,
        devNotice: "SMTP is not configured. The code was printed to the server log.",
      });
    }
    return NextResponse.json({ error: "We could not send the code right now. Please try again in a moment." }, { status: 502 });
  }

  return NextResponse.json({ success: true, cooldownSeconds: COOLDOWN_SECONDS, expiresInSeconds: issued.expiresInSeconds });
}
