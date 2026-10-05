import { NextResponse } from "next/server";

interface RateLimitStore {
  count: number;
  resetAt: number;
}

const memoryStore = new Map<string, RateLimitStore>();

export interface RateLimitOptions {
  limit?: number; // Max requests
  windowMs?: number; // Window size in milliseconds
}

/**
 * Sliding window rate limiter with Upstash Redis support and memory fallback.
 */
export async function checkRateLimit(
  identifier: string,
  options: RateLimitOptions = {}
): Promise<{ success: boolean; limit: number; remaining: number; reset: number }> {
  const limit = options.limit || 10;
  const windowMs = options.windowMs || 60 * 1000; // 1 minute default
  const now = Date.now();

  // 1. Try Upstash Redis if env configured
  const redisUrl = process.env.UPSTASH_REDIS_REST_URL;
  const redisToken = process.env.UPSTASH_REDIS_REST_TOKEN;

  if (redisUrl && redisToken) {
    try {
      const key = `ratelimit:${identifier}`;
      const res = await fetch(`${redisUrl}/pipeline`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${redisToken}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify([
          ["INCR", key],
          ["PEXPIRE", key, windowMs]
        ])
      });

      if (res.ok) {
        const data = await res.json();
        const currentCount = Number(data[0]?.result || 1);
        const remaining = Math.max(0, limit - currentCount);
        return {
          success: currentCount <= limit,
          limit,
          remaining,
          reset: now + windowMs
        };
      }
    } catch (err) {
      console.warn("Upstash Redis rate limit call failed, falling back to memory:", err);
    }
  }

  // 2. In-Memory Sliding Window Fallback
  const record = memoryStore.get(identifier);
  if (!record || now > record.resetAt) {
    const newRecord = { count: 1, resetAt: now + windowMs };
    memoryStore.set(identifier, newRecord);
    return { success: true, limit, remaining: limit - 1, reset: newRecord.resetAt };
  }

  if (record.count >= limit) {
    return { success: false, limit, remaining: 0, reset: record.resetAt };
  }

  record.count += 1;
  memoryStore.set(identifier, record);
  return { success: true, limit, remaining: limit - record.count, reset: record.resetAt };
}

export async function rateLimitMiddleware(
  identifier: string,
  options: RateLimitOptions = {}
): Promise<NextResponse | null> {
  const result = await checkRateLimit(identifier, options);
  if (!result.success) {
    return NextResponse.json(
      { error: "Too many requests. Please slow down and try again later." },
      {
        status: 429,
        headers: {
          "Retry-After": String(Math.ceil((result.reset - Date.now()) / 1000)),
          "X-RateLimit-Limit": String(result.limit),
          "X-RateLimit-Remaining": String(result.remaining)
        }
      }
    );
  }
  return null;
}
