import { NextRequest, NextResponse } from "next/server";
import { requireSuperAdmin } from "@/lib/auth/rbac";
import { offboardEmployee } from "@/lib/auth/session-manager";

export async function POST(request: NextRequest) {
  const auth = await requireSuperAdmin(request);
  if (auth.error) return auth.error;

  try {
    const body = await request.json() as { userId: string };
    if (!body.userId) {
      return NextResponse.json({ error: "userId is required for offboarding." }, { status: 400 });
    }

    const result = offboardEmployee(body.userId, {
      id: auth.session?.userId,
      email: auth.session?.email,
      role: auth.session?.role
    });

    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }

    return NextResponse.json({ success: true, message: result.message });
  } catch (err) {
    return NextResponse.json({ error: "Failed to offboard employee." }, { status: 500 });
  }
}
