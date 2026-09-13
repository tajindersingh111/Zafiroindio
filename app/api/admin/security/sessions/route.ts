import { NextRequest, NextResponse } from "next/server";
import { readCollection } from "@/lib/db/store";
import { requireSuperAdmin } from "@/lib/auth/rbac";
import { terminateSession, terminateAllUserSessions, ActiveSession } from "@/lib/auth/session-manager";

export async function GET(request: NextRequest) {
  const auth = await requireSuperAdmin(request);
  if (auth.error) return auth.error;

  const sessions = readCollection<ActiveSession>("active-sessions");
  const activeOnly = sessions.filter((s) => s.status === "active");

  return NextResponse.json({
    sessions,
    activeCount: activeOnly.length,
    totalSessions: sessions.length
  });
}

export async function DELETE(request: NextRequest) {
  const auth = await requireSuperAdmin(request);
  if (auth.error) return auth.error;

  const { searchParams } = new URL(request.url);
  const sessionId = searchParams.get("sessionId");
  const userId = searchParams.get("userId");

  if (sessionId) {
    const success = terminateSession(sessionId, {
      id: auth.session?.userId,
      email: auth.session?.email,
      role: auth.session?.role
    });
    if (!success) return NextResponse.json({ error: "Session not found." }, { status: 404 });
    return NextResponse.json({ success: true, message: "Session terminated." });
  }

  if (userId) {
    const success = terminateAllUserSessions(userId, {
      id: auth.session?.userId,
      email: auth.session?.email,
      role: auth.session?.role
    });
    return NextResponse.json({ success: true, message: "All sessions for user terminated." });
  }

  return NextResponse.json({ error: "sessionId or userId required." }, { status: 400 });
}
