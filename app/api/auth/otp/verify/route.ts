import { NextResponse } from "next/server";
import { verifyOtp } from "@/lib/auth/otp";
import {
  buildCustomerSessionCookie,
  customerCookieOptions,
  customerDisplayName,
  customerProfileView,
  findOrCreateCustomerByPhone,
  isSameOrigin,
  CUSTOMER_COOKIE_NAME,
} from "@/lib/auth/customer";
import { checkRateLimit, rateLimitResponse } from "@/lib/security/rate-limit";
import { getClientIp } from "@/lib/security/client-ip";
import { normalizePhone } from "@/lib/orders/contact";

export const dynamic = "force-dynamic";

/**
 * Checks the code and, on success, signs the shopper in: the customer record is created on first
 * login and a signed session cookie is set.
 *
 * lib/auth/otp.ts already limits wrong guesses per code (5, then the code is burned); the limiter
 * here stops someone cycling through fresh codes from one IP.
 */
export async function POST(request: Request) {
  if (!isSameOrigin(request)) return NextResponse.json({ error: "Cross-site request blocked." }, { status: 403 });

  const ip = getClientIp(request);
  const ipLimit = await checkRateLimit(`otp-verify:ip:${ip}`, { windowMs: 15 * 60_000, maxRequests: 30 });
  if (!ipLimit.success) return rateLimitResponse(ipLimit.reset);

  let body: { phone?: unknown; code?: unknown };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }

  const rawPhone = typeof body.phone === "string" ? body.phone : "";
  const rawCode = typeof body.code === "string" ? body.code : "";
  if (rawPhone.length > 20 || rawCode.length > 10) return NextResponse.json({ error: "Invalid request." }, { status: 400 });

  const phoneLimit = await checkRateLimit(`otp-verify:phone:${normalizePhone(rawPhone)}`, { windowMs: 15 * 60_000, maxRequests: 15 });
  if (!phoneLimit.success) return rateLimitResponse(phoneLimit.reset);

  const result = await verifyOtp(rawPhone, rawCode);
  if (!result.ok) {
    const status = result.reason === "locked" ? 429 : 400;
    return NextResponse.json({ error: result.message, attemptsLeft: result.attemptsLeft }, { status });
  }

  const customer = await findOrCreateCustomerByPhone(result.phone);

  const response = NextResponse.json({ success: true, customer: customerProfileView(customer) });
  response.cookies.set(
    CUSTOMER_COOKIE_NAME,
    buildCustomerSessionCookie({ id: customer.id, phone: customer.phone || result.phone, name: customerDisplayName(customer) }),
    customerCookieOptions()
  );
  return response;
}
