import crypto from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";

export const dynamic = "force-dynamic";

function authorized(request: NextRequest): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false; // fail closed: previously an unset secret left this endpoint open to everyone
  const given = (request.headers.get("authorization") || "").replace(/^Bearer\s+/i, "") || request.headers.get("x-cron-secret") || "";
  const a = Buffer.from(given);
  const b = Buffer.from(secret);
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}

/**
 * Housekeeping cron (schedule it daily). Orders are only created after payment succeeds, so there
 * are no "pending payment" orders to cancel any more; this prunes the data that does pile up:
 * abandoned checkout sessions, expired rate-limit counters and old webhook idempotency rows.
 */
export async function POST(request: NextRequest) {
  if (!authorized(request)) return NextResponse.json({ error: "Unauthorized cron execution." }, { status: 401 });

  const dayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
  const monthAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

  const [sessions, links, limits, events] = await Promise.all([
    prisma.document.deleteMany({ where: { collection: "checkout-sessions", createdAt: { lt: dayAgo }, data: { path: ["status"], equals: "pending" } } }),
    prisma.document.deleteMany({ where: { collection: "checkout-sessions-by-sr", createdAt: { lt: monthAgo } } }),
    prisma.rateLimit.deleteMany({ where: { resetAt: { lt: new Date() } } }),
    prisma.webhookEvent.deleteMany({ where: { createdAt: { lt: monthAgo } } }),
  ]);

  return NextResponse.json({ success: true, prunedCheckoutSessions: sessions.count, prunedSessionLinks: links.count, prunedRateLimits: limits.count, prunedWebhookEvents: events.count });
}
