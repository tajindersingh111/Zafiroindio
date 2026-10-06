import { NextRequest, NextResponse } from "next/server";
import { getAuthSession } from "@/lib/auth/rbac";

export async function GET(request: NextRequest) {
  const session = await getAuthSession(request);
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  return NextResponse.json({
    user: {
      userId: session.userId,
      name: session.name,
      email: session.email,
      role: session.role,
      allowedSections: session.allowedSections,
    },
  });
}
