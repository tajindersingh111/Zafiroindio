import { NextResponse } from "next/server";
import { issueOtp, OTP_RESEND_COOLDOWN_MS } from "@/lib/auth/otp";
import { sendLoginOtpWhatsApp } from "@/lib/notifications/whatsapp";
import { checkRateLimit, rateLimitResponse } from "@/lib/security/rate-limit";
import { getClientIp } from "@/lib/security/client-ip";
import { normalizePhone } from "@/lib/orders/contact";
import { isSameOrigin } from "@/lib/auth/customer";

export const dynamic = "force-dynamic";

/**
 * Sends a login code to a mobile number over WhatsApp.
 *
 * Every send costs money, so this is limited three ways: per IP (a script cannot run up the bill),
 * per phone number (lib/auth/otp.ts: a 60s cooldown and 3 per hour), and by refusing to create the
 * code at all if WhatsApp is not configured.
 *
 * The response never says whether the number is already a customer — that would turn this endpoint
 * into a "is this person a customer here" oracle.
 */
export async function POST(request: Request) {
  if (!isSameOrigin(request)) return NextResponse.json({ error: "Cross-site request blocked." }, { status: 403 });

  const ip = getClientIp(request);
  // Mobile carriers put many shoppers behind one IP (CGNAT), so this is generous but still finite.
  const ipLimit = await checkRateLimit(`otp-send:ip:${ip}`, { windowMs: 60 * 60_000, maxRequests: 20 });
  if (!ipLimit.success) return rateLimitResponse(ipLimit.reset);

  let body: { phone?: unknown };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }

  const rawPhone = typeof body.phone === "string" ? body.phone : "";
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
        cooldownSeconds: Math.floor(OTP_RESEND_COOLDOWN_MS / 1000),
        expiresInSeconds: issued.expiresInSeconds,
        devNotice: "WhatsApp is not configured. The code was printed to the server log.",
      });
    }
    console.error("[otp] delivery failed:", sent.error);
    return NextResponse.json({ error: "We could not send the code right now. Please try again in a moment." }, { status: 502 });
  }

  return NextResponse.json({
    success: true,
    cooldownSeconds: Math.floor(OTP_RESEND_COOLDOWN_MS / 1000),
    expiresInSeconds: issued.expiresInSeconds,
  });
}
