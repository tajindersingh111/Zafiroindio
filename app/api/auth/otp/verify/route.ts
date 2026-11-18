import { NextResponse } from "next/server";
import { verifyEmailOtp } from "@/lib/auth/otp";
import {
  buildCustomerSessionCookie,
  customerCookieOptions,
  customerDisplayName,
  customerProfileView,
  findOrCreateCustomerByEmail,
  isSameOrigin,
  CUSTOMER_COOKIE_NAME,
} from "@/lib/auth/customer";
import { checkRateLimit, rateLimitResponse } from "@/lib/security/rate-limit";
import { getClientIp } from "@/lib/security/client-ip";
import { normalizeEmail } from "@/lib/orders/contact";

export const dynamic = "force-dynamic";

/**
 * Checks the code and, on success, signs the shopper in: the customer record is created on first
 * login and a signed session cookie is set.
 *
 * lib/auth/otp.ts already limits wrong guesses per code (5, then the code is burned); the limiters
 * here stop someone cycling through fresh codes from one IP or against one address.
 */
export async function POST(request: Request) {
  if (!isSameOrigin(request)) return NextResponse.json({ error: "Cross-site request blocked." }, { status: 403 });

  const ip = getClientIp(request);
  const ipLimit = await checkRateLimit(`otp-verify:ip:${ip}`, { windowMs: 15 * 60_000, maxRequests: 30 });
  if (!ipLimit.success) return rateLimitResponse(ipLimit.reset);

  let body: { email?: unknown; code?: unknown };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }

  const rawCode = typeof body.code === "string" ? body.code : "";
  if (rawCode.length > 10) return NextResponse.json({ error: "Invalid request." }, { status: 400 });

  const rawEmail = typeof body.email === "string" ? body.email : "";
  if (rawEmail.length > 254) return NextResponse.json({ error: "Invalid request." }, { status: 400 });

  const emailLimit = await checkRateLimit(`otp-verify:email:${normalizeEmail(rawEmail)}`, { windowMs: 15 * 60_000, maxRequests: 15 });
  if (!emailLimit.success) return rateLimitResponse(emailLimit.reset);

  const result = await verifyEmailOtp(rawEmail, rawCode);
  if (!result.ok) {
    return NextResponse.json({ error: result.message, attemptsLeft: result.attemptsLeft }, { status: result.reason === "locked" ? 429 : 400 });
  }

  const customer = await findOrCreateCustomerByEmail(result.email);

  // A blocked customer has proved they own the address, but must not be handed a session.
  if (customer.status !== "active") {
    return NextResponse.json({ error: "This account is not available. Please contact us for help." }, { status: 403 });
  }

  const response = NextResponse.json({ success: true, customer: customerProfileView(customer) });
  response.cookies.set(
    CUSTOMER_COOKIE_NAME,
    buildCustomerSessionCookie({ id: customer.id, name: customerDisplayName(customer), email: result.email }),
    customerCookieOptions()
  );
  return response;
}
