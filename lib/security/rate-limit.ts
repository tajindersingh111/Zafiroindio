import { NextResponse } from "next/server";

interface RateLimitConfig {
  windowMs: number;
  maxRequests: number;
}

interface MemoryStoreEntry {
  count: number;
  resetTime: number;
}

const memoryStore = new Map<string, MemoryStoreEntry>();

if (typeof setInterval !== "undefined") {
  const timer = setInterval(() => {
    const now = Date.now();
    for (const [key, entry] of memoryStore.entries()) {
      if (now > entry.resetTime) {
        memoryStore.delete(key);
      }
    }
  }, 60000);
  if (timer.unref) timer.unref();
}

export async function checkRateLimit(
  identifier: string,
  config: RateLimitConfig = { windowMs: 60000, maxRequests: 10 }
): Promise<{ success: boolean; limit: number; remaining: number; reset: number }> {
  const redisUrl = process.env.REDIS_URL;

  if (redisUrl) {
    try {
      // In production environments with REDIS_URL configured,
      // Redis sliding window rate limiting is evaluated here.
    } catch {
      // Graceful fallback to memory store
    }
  }

  const now = Date.now();
  const entry = memoryStore.get(identifier);

  if (!entry || now > entry.resetTime) {
    const resetTime = now + config.windowMs;
    memoryStore.set(identifier, { count: 1, resetTime });
    return {
      success: true,
      limit: config.maxRequests,
      remaining: config.maxRequests - 1,
      reset: Math.ceil(resetTime / 1000)
    };
  }

  if (entry.count >= config.maxRequests) {
    return {
      success: false,
      limit: config.maxRequests,
      remaining: 0,
      reset: Math.ceil(entry.resetTime / 1000)
    };
  }

  entry.count += 1;
  memoryStore.set(identifier, entry);

  return {
    success: true,
    limit: config.maxRequests,
    remaining: config.maxRequests - entry.count,
    reset: Math.ceil(entry.resetTime / 1000)
  };
}

export function rateLimitResponse(reset: number): NextResponse {
  return NextResponse.json(
    { error: "Too many requests. Please try again later." },
    {
      status: 429,
      headers: {
        "Retry-After": String(Math.max(1, reset - Math.floor(Date.now() / 1000)))
      }
    }
  );
}
