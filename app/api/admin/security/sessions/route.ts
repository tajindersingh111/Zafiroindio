import { NextRequest, NextResponse } from "next/server";
import { readCollection } from "@/lib/db/store";
import { requireSuperAdmin } from "@/lib/auth/rbac";
import { terminateSession, terminateAllUserSessions, ActiveSession } from "@/lib/auth/session-manager";
import { guarded } from "@/lib/auth/guard";

async function handleGET(request: NextRequest) {
  const auth = await requireSuperAdmin(request);
  if (auth.error) return auth.error;

  const sessions = await readCollection<ActiveSession>("active-sessions");
  const activeOnly = sessions.filter((s) => s.status === "active");

  return NextResponse.json({
    sessions,
    activeCount: activeOnly.length,
    totalSessions: sessions.length
  });
}

async function handleDELETE(request: NextRequest) {
  const auth = await requireSuperAdmin(request);
  if (auth.error) return auth.error;

  const { searchParams } = new URL(request.url);
  const sessionId = searchParams.get("sessionId");
  const userId = searchParams.get("userId");

  if (sessionId) {
    const success = await terminateSession(sessionId, {
      id: auth.session?.userId,
      email: auth.session?.email,
      role: auth.session?.role
    });
    if (!success) return NextResponse.json({ error: "Session not found." }, { status: 404 });
    return NextResponse.json({ success: true, message: "Session terminated." });
  }

  if (userId) {
    const success = await terminateAllUserSessions(userId, {
      id: auth.session?.userId,
      email: auth.session?.email,
      role: auth.session?.role
    });
    return NextResponse.json({ success: true, message: "All sessions for user terminated." });
  }

  return NextResponse.json({ error: "sessionId or userId required." }, { status: 400 });
}

export const GET = guarded(handleGET);
export const DELETE = guarded(handleDELETE);
