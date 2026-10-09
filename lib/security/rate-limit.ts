import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { getClientIp } from "@/lib/security/client-ip";

export interface RateLimitConfig {
  windowMs: number;
  maxRequests: number;
}

export interface RateLimitResult {
  success: boolean;
  limit: number;
  remaining: number;
  /** Unix seconds when the window resets. */
  reset: number;
}

/**
 * Fixed-window rate limiter backed by Postgres, so the limit is shared by every server instance
 * (the old in-memory Map was per-process and useless on serverless / multi-instance hosting).
 */
export async function checkRateLimit(
  identifier: string,
  config: RateLimitConfig = { windowMs: 60_000, maxRequests: 10 }
): Promise<RateLimitResult> {
  const windowSeconds = Math.max(1, Math.ceil(config.windowMs / 1000));
  try {
    const rows = await prisma.$queryRaw<{ count: number; reset: Date }[]>`
      INSERT INTO rate_limits ("key", "count", "resetAt")
      VALUES (${identifier}, 1, now() + (${windowSeconds}::int * interval '1 second'))
      ON CONFLICT ("key") DO UPDATE SET
        "count"   = CASE WHEN rate_limits."resetAt" <= now() THEN 1 ELSE rate_limits."count" + 1 END,
        "resetAt" = CASE WHEN rate_limits."resetAt" <= now()
                         THEN now() + (${windowSeconds}::int * interval '1 second')
                         ELSE rate_limits."resetAt" END
      RETURNING "count", "resetAt" AS reset`;
    const { count, reset } = rows[0];
    return {
      success: count <= config.maxRequests,
      limit: config.maxRequests,
      remaining: Math.max(0, config.maxRequests - count),
      reset: Math.ceil(new Date(reset).getTime() / 1000),
    };
  } catch (error) {
    // Never take the shop down because the limiter table is unavailable.
    console.error("Rate limiter unavailable, allowing request:", error);
    return { success: true, limit: config.maxRequests, remaining: config.maxRequests, reset: Math.ceil((Date.now() + config.windowMs) / 1000) };
  }
}

export function rateLimitResponse(reset: number): NextResponse {
  return NextResponse.json(
    { error: "Too many requests. Please try again later." },
    { status: 429, headers: { "Retry-After": String(Math.max(1, reset - Math.floor(Date.now() / 1000))) } }
  );
}

/**
 * Per-instance fixed window kept in memory: no database round trip. For high-volume, low-risk
 * buckets (polling, catalogue sync, webhooks) where an exact cross-instance count doesn't matter.
 */
const memory = new Map<string, { count: number; resetAt: number }>();
function checkMemoryLimit(identifier: string, config: RateLimitConfig): RateLimitResult {
  const now = Date.now();
  let w = memory.get(identifier);
  if (!w || w.resetAt <= now) {
    if (memory.size > 50_000) for (const [k, v] of memory) if (v.resetAt <= now) memory.delete(k);
    w = { count: 0, resetAt: now + config.windowMs };
    memory.set(identifier, w);
  }
  w.count += 1;
  return { success: w.count <= config.maxRequests, limit: config.maxRequests, remaining: Math.max(0, config.maxRequests - w.count), reset: Math.ceil(w.resetAt / 1000) };
}

/**
 * Convenience: returns a 429 response when the caller is over the limit, otherwise null.
 * Limits are per IP; remember that mobile carriers put many shoppers behind one IP (CGNAT), so
 * shopping paths need generous limits. `store: "memory"` skips the database (see checkMemoryLimit).
 */
export async function rateLimit(
  request: Request,
  bucket: string,
  config: RateLimitConfig & { store?: "db" | "memory" },
  extraKey = ""
): Promise<NextResponse | null> {
  const id = `${bucket}:${getClientIp(request)}${extraKey ? ":" + extraKey : ""}`;
  const result = config.store === "memory" ? checkMemoryLimit(id, config) : await checkRateLimit(id, config);
  return result.success ? null : rateLimitResponse(result.reset);
}
