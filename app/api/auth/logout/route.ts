import { NextResponse } from "next/server";
import { CUSTOMER_COOKIE_NAME, customerCookieOptions, isSameOrigin } from "@/lib/auth/customer";

export const dynamic = "force-dynamic";

/** Signs the shopper out by clearing the session cookie. */
export async function POST(request: Request) {
  if (!isSameOrigin(request)) return NextResponse.json({ error: "Cross-site request blocked." }, { status: 403 });

  const response = NextResponse.json({ success: true });
  // Overwrite then delete: some proxies drop a bare delete, an empty value with maxAge 0 is honoured.
  response.cookies.set(CUSTOMER_COOKIE_NAME, "", customerCookieOptions(0));
  response.cookies.delete(CUSTOMER_COOKIE_NAME);
  return response;
}
