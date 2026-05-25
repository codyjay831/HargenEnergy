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
  | "admin-setup"
  | "portal-request-submit"
  | "portal-comment"
  | "outreach-google-search"
  | "outreach-permitstack-search"
  | "outreach-yelp-enrich"
  | "outreach-gemini-assist";

const FAIL_CLOSED_BUCKETS = new Set<RateLimitBucket>([
  "login",
  "password-reset-request",
  "password-reset-complete",
  "public-intake",
  "admin-setup",
]);

const BUCKET_CONFIG: Record<
  RateLimitBucket,
  { max: number; windowSec: number }
> = {
  login: { max: 30, windowSec: 15 * 60 },
  "password-reset-request": { max: 10, windowSec: 60 * 60 },
  "password-reset-complete": { max: 20, windowSec: 60 * 60 },
  "public-intake": { max: 15, windowSec: 60 * 60 },
  "admin-setup": { max: 15, windowSec: 60 * 60 },
  /** Authenticated client portal: new support requests (keyed by user id). */
  "portal-request-submit": { max: 25, windowSec: 60 * 60 },
  /** Authenticated client portal: comments on requests (keyed by user id). */
  "portal-comment": { max: 120, windowSec: 60 * 60 },
  /** Admin outreach contractor finder: Google Places text search. */
  "outreach-google-search": { max: 20, windowSec: 10 * 60 },
  /** Admin outreach contractor finder: PermitStack lookups. */
  "outreach-permitstack-search": { max: 15, windowSec: 10 * 60 },
  /** Admin outreach enrichment: Yelp match/search per company. */
  "outreach-yelp-enrich": { max: 30, windowSec: 60 * 60 },
  /** Admin outreach: Gemini PermitStack query assist. */
  "outreach-gemini-assist": { max: 10, windowSec: 60 * 60 },
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

function shouldFailClosedWithoutBackend(bucket: RateLimitBucket): boolean {
  return (
    process.env.NODE_ENV === "production" &&
    process.env.RATE_LIMIT_ALLOW_MEMORY !== "1" &&
    FAIL_CLOSED_BUCKETS.has(bucket)
  );
}

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
      if (shouldFailClosedWithoutBackend(bucket)) {
        return { allowed: false, retryAfterSec: 60 };
      }
      return { allowed: true, retryAfterSec: 0 };
    }
  }

  if (shouldUseMemoryRateLimitBackend()) {
    return memoryFixedWindow(key, max, windowSec);
  }

  if (shouldFailClosedWithoutBackend(bucket)) {
    if (!warnedProdNoBackend) {
      warnedProdNoBackend = true;
      console.error(
        "[rate-limit] Upstash is required in production for sensitive buckets. " +
          "Set UPSTASH_REDIS_REST_URL / UPSTASH_REDIS_REST_TOKEN " +
          "or explicitly set RATE_LIMIT_ALLOW_MEMORY=1 for single-node fallback.",
      );
    }
    return { allowed: false, retryAfterSec: 60 };
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
 * Best-effort client IP for rate limiting.
 *
 * Header trust model:
 *   - `x-forwarded-for` (first hop): set by Vercel and most managed platforms;
 *     attacker-supplied values are appended after the platform-set client IP,
 *     so the leftmost segment is the platform-attested source IP.
 *   - `x-real-ip`: set by Vercel / common proxies; safe fallback.
 *   - `cf-connecting-ip`: ONLY trusted when `RATE_LIMIT_TRUST_CF_IP=1`. When the
 *     app is not actually behind Cloudflare, an attacker can supply this header
 *     to mint a unique rate-limit identifier per request and bypass the limiter.
 */
export async function getRateLimitIdentifier(): Promise<string> {
  try {
    const h = await headers();

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

    if (process.env.RATE_LIMIT_TRUST_CF_IP === "1") {
      const cf = h.get("cf-connecting-ip")?.trim();
      if (cf) {
        return `ip:${cf}`;
      }
    }
  } catch {
    // headers() unavailable (e.g. some static contexts)
  }
  return "ip:unknown";
}
