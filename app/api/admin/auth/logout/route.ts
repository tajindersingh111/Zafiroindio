import { NextRequest, NextResponse } from "next/server";
import { parseSessionString, SESSION_COOKIE_NAME } from "@/lib/auth/session";
import { endSession } from "@/lib/auth/session-manager";

export async function POST(request: NextRequest) {
  const session = parseSessionString(request.cookies.get(SESSION_COOKIE_NAME)?.value);
  if (session) await endSession(session.sid).catch(() => {});
  const response = NextResponse.json({ success: true });
  response.cookies.delete(SESSION_COOKIE_NAME);
  return response;
}
