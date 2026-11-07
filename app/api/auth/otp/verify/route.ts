import { NextResponse } from "next/server";
import { verifyEmailOtp, verifyOtp } from "@/lib/auth/otp";
import {
  buildCustomerSessionCookie,
  customerCookieOptions,
  customerDisplayName,
  customerProfileView,
  findOrCreateCustomerByEmail,
  findOrCreateCustomerByPhone,
  isSameOrigin,
  CUSTOMER_COOKIE_NAME,
} from "@/lib/auth/customer";
import { checkRateLimit, rateLimitResponse } from "@/lib/security/rate-limit";
import { getClientIp } from "@/lib/security/client-ip";
import { normalizeEmail, normalizePhone } from "@/lib/orders/contact";
import type { Customer } from "@/lib/db/types";

export const dynamic = "force-dynamic";

/**
 * Checks the code and, on success, signs the shopper in: the customer record is created on first
 * login and a signed session cookie is set. Works for both channels (`channel: "email"`, else phone).
 *
 * lib/auth/otp.ts already limits wrong guesses per code (5, then the code is burned); the limiters
 * here stop someone cycling through fresh codes from one IP or against one recipient.
 */
export async function POST(request: Request) {
  if (!isSameOrigin(request)) return NextResponse.json({ error: "Cross-site request blocked." }, { status: 403 });

  const ip = getClientIp(request);
  const ipLimit = await checkRateLimit(`otp-verify:ip:${ip}`, { windowMs: 15 * 60_000, maxRequests: 30 });
  if (!ipLimit.success) return rateLimitResponse(ipLimit.reset);

  let body: { channel?: unknown; phone?: unknown; email?: unknown; code?: unknown };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }

  const rawCode = typeof body.code === "string" ? body.code : "";
  if (rawCode.length > 10) return NextResponse.json({ error: "Invalid request." }, { status: 400 });

  const isEmail = body.channel === "email";
  const rawTarget = typeof (isEmail ? body.email : body.phone) === "string" ? ((isEmail ? body.email : body.phone) as string) : "";
  if (rawTarget.length > (isEmail ? 254 : 20)) return NextResponse.json({ error: "Invalid request." }, { status: 400 });

  const targetKey = isEmail ? normalizeEmail(rawTarget) : normalizePhone(rawTarget);
  const targetLimit = await checkRateLimit(`otp-verify:${isEmail ? "email" : "phone"}:${targetKey}`, { windowMs: 15 * 60_000, maxRequests: 15 });
  if (!targetLimit.success) return rateLimitResponse(targetLimit.reset);

  let customer: Customer;
  let session: { phone?: string; email?: string };

  if (isEmail) {
    const result = await verifyEmailOtp(rawTarget, rawCode);
    if (!result.ok) {
      return NextResponse.json({ error: result.message, attemptsLeft: result.attemptsLeft }, { status: result.reason === "locked" ? 429 : 400 });
    }
    customer = await findOrCreateCustomerByEmail(result.email);
    session = { email: result.email };
  } else {
    const result = await verifyOtp(rawTarget, rawCode);
    if (!result.ok) {
      return NextResponse.json({ error: result.message, attemptsLeft: result.attemptsLeft }, { status: result.reason === "locked" ? 429 : 400 });
    }
    customer = await findOrCreateCustomerByPhone(result.phone);
    session = { phone: customer.phone || result.phone };
  }

  // A blocked customer has proved they own the contact, but must not be handed a session.
  if (customer.status !== "active") {
    return NextResponse.json({ error: "This account is not available. Please contact us for help." }, { status: 403 });
  }

  const response = NextResponse.json({ success: true, customer: customerProfileView(customer) });
  response.cookies.set(
    CUSTOMER_COOKIE_NAME,
    buildCustomerSessionCookie({ id: customer.id, name: customerDisplayName(customer), ...session }),
    customerCookieOptions()
  );
  return response;
}
