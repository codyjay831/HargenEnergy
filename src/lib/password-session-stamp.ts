/**
 * Replicates the latest `User.passwordChangedAt` (epoch ms) for JWT/session checks
 * that run in Edge middleware, where Prisma cannot run.
 *
 * - Production: Upstash Redis (`UPSTASH_REDIS_REST_URL` / `UPSTASH_REDIS_REST_TOKEN`)
 *   should match rate limiting; without it, password-change session revocation cannot
 *   be enforced across requests/instances.
 * - Local development: when Redis is not configured, an in-process map is used so
 *   revocation still works on a single dev server.
 */

import { Redis } from "@upstash/redis";

const REDIS_KEY_PREFIX = "hargen:pwdv:v1:";

let redisClient: Redis | null = null;
let redisInitAttempted = false;

export function hasUpstashCredentials(): boolean {
  return !!(
    process.env.UPSTASH_REDIS_REST_URL?.trim() &&
    process.env.UPSTASH_REDIS_REST_TOKEN?.trim()
  );
}

function getUpstashRedis(): Redis | null {
  if (redisInitAttempted) {
    return redisClient;
  }
  redisInitAttempted = true;
  if (hasUpstashCredentials()) {
    redisClient = new Redis({
      url: process.env.UPSTASH_REDIS_REST_URL!,
      token: process.env.UPSTASH_REDIS_REST_TOKEN!,
    });
  }
  return redisClient;
}

const devMemoryStamps = new Map<string, number>();

function isDevMemoryStampBackend(): boolean {
  return process.env.NODE_ENV === "development" && !hasUpstashCredentials();
}

export function stampKeyForUser(userId: string): string {
  return `${REDIS_KEY_PREFIX}${userId}`;
}

/**
 * Persists the canonical password-change stamp for session/JWT checks (ms since epoch).
 */
export async function setPasswordSessionStampMs(
  userId: string,
  changedAtMs: number,
): Promise<void> {
  const redis = getUpstashRedis();
  if (redis) {
    await redis.set(stampKeyForUser(userId), String(changedAtMs));
    return;
  }
  if (isDevMemoryStampBackend()) {
    devMemoryStamps.set(userId, changedAtMs);
  }
}

/**
 * Reads the latest stamp used to invalidate JWTs minted before the last password change.
 */
export async function getPasswordSessionStampMs(
  userId: string,
): Promise<number | null> {
  const redis = getUpstashRedis();
  if (redis) {
    const raw = await redis.get(stampKeyForUser(userId));
    if (raw == null || raw === "") {
      return null;
    }
    const n = parseInt(String(raw), 10);
    return Number.isNaN(n) ? null : n;
  }
  if (isDevMemoryStampBackend()) {
    return devMemoryStamps.get(userId) ?? null;
  }
  return null;
}
