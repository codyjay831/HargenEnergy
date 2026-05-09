import "server-only";

import { Redis } from "@upstash/redis";
import { headers } from "next/headers";

/**
 * Distributed rate limiting via Upstash Redis when configured.
 *
 * Env (production / multi-instance):
 *   - UPSTASH_REDIS_REST_URL
 *   - UPSTASH_REDIS_REST_TOKEN
 *
 * Local / single-instance fallback (NOT safe across multiple app instances):
 *   - NODE_ENV=development uses in-memory limiter automatically, OR
 *   - RATE_LIMIT_ALLOW_MEMORY=1 to force in-memory on any environment
 *
 * Without Upstash and without RATE_LIMIT_ALLOW_MEMORY=1 in production, requests
 * are allowed but a one-time console warning is emitted (deploy should set Redis).
 */

export type RateLimitBucket =
  | "login"
  | "password-reset-request"
  | "password-reset-complete"
  | "public-intake"
  | "admin-setup";

const BUCKET_CONFIG: Record<
  RateLimitBucket,
  { max: number; windowSec: number }
> = {
  login: { max: 30, windowSec: 15 * 60 },
  "password-reset-request": { max: 10, windowSec: 60 * 60 },
  "password-reset-complete": { max: 20, windowSec: 60 * 60 },
  "public-intake": { max: 15, windowSec: 60 * 60 },
  "admin-setup": { max: 15, windowSec: 60 * 60 },
};

let redisClient: Redis | null = null;
let redisInitAttempted = false;

function getRedis(): Redis | null {
  if (redisInitAttempted) {
    return redisClient;
  }
  redisInitAttempted = true;
  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;
  if (url && token) {
    redisClient = new Redis({ url, token });
  }
  return redisClient;
}

type MemoryWindow = { count: number; windowId: number };
const memoryWindows = new Map<string, MemoryWindow>();

let warnedProdNoBackend = false;

function shouldUseMemoryRateLimitBackend(): boolean {
  if (process.env.NODE_ENV === "development") {
    return true;
  }
  return process.env.RATE_LIMIT_ALLOW_MEMORY === "1";
}

function memoryFixedWindow(
  key: string,
  max: number,
  windowSec: number,
): { allowed: boolean; retryAfterSec: number } {
  const nowSec = Math.floor(Date.now() / 1000);
  const windowId = Math.floor(nowSec / windowSec);
  const compositeKey = `${key}:${windowId}`;
  const prev = memoryWindows.get(compositeKey);
  const count =
    prev && prev.windowId === windowId ? prev.count + 1 : 1;
  memoryWindows.set(compositeKey, { count, windowId });
  if (count > max) {
    const windowEndSec = (windowId + 1) * windowSec;
    return {
      allowed: false,
      retryAfterSec: Math.max(1, windowEndSec - nowSec),
    };
  }
  return { allowed: true, retryAfterSec: 0 };
}

async function redisFixedWindow(
  key: string,
  max: number,
  windowSec: number,
): Promise<{ allowed: boolean; retryAfterSec: number }> {
  const redis = getRedis();
  if (!redis) {
    throw new Error("Redis not configured");
  }
  const nowSec = Math.floor(Date.now() / 1000);
  const windowId = Math.floor(nowSec / windowSec);
  const redisKey = `${key}:${windowId}`;
  const count = await redis.incr(redisKey);
  if (count === 1) {
    await redis.expire(redisKey, windowSec + 5);
  }
  if (count > max) {
    const windowEndSec = (windowId + 1) * windowSec;
    return {
      allowed: false,
      retryAfterSec: Math.max(1, windowEndSec - nowSec),
    };
  }
  return { allowed: true, retryAfterSec: 0 };
}

export async function checkRateLimit(
  bucket: RateLimitBucket,
  identifier: string,
): Promise<{ allowed: boolean; retryAfterSec: number }> {
  const { max, windowSec } = BUCKET_CONFIG[bucket];
  const key = `hargen:rl:v1:${bucket}:${identifier}`;

  const redis = getRedis();
  if (redis) {
    try {
      return await redisFixedWindow(key, max, windowSec);
    } catch (e) {
      console.error("[rate-limit] Upstash error, falling back to memory if allowed:", e);
      if (shouldUseMemoryRateLimitBackend()) {
        return memoryFixedWindow(key, max, windowSec);
      }
      return { allowed: true, retryAfterSec: 0 };
    }
  }

  if (shouldUseMemoryRateLimitBackend()) {
    return memoryFixedWindow(key, max, windowSec);
  }

  if (process.env.NODE_ENV === "production" && !warnedProdNoBackend) {
    warnedProdNoBackend = true;
    console.warn(
      "[rate-limit] UPSTASH_REDIS_REST_URL / UPSTASH_REDIS_REST_TOKEN not set; " +
        "rate limits are inactive. Set Upstash credentials or RATE_LIMIT_ALLOW_MEMORY=1 for single-node.",
    );
  }

  return { allowed: true, retryAfterSec: 0 };
}

/**
 * Best-effort client IP for rate limiting (Vercel, common proxies).
 */
export async function getRateLimitIdentifier(): Promise<string> {
  try {
    const h = await headers();
    const cf = h.get("cf-connecting-ip")?.trim();
    if (cf) {
      return `ip:${cf}`;
    }
    const forwarded = h.get("x-forwarded-for");
    if (forwarded) {
      const first = forwarded.split(",")[0]?.trim();
      if (first) {
        return `ip:${first}`;
      }
    }
    const realIp = h.get("x-real-ip")?.trim();
    if (realIp) {
      return `ip:${realIp}`;
    }
  } catch {
    // headers() unavailable (e.g. some static contexts)
  }
  return "ip:unknown";
}
