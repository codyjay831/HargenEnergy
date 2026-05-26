import "server-only";

import { randomBytes } from "node:crypto";
import { getRedisClient } from "@/lib/redis-client";

const OAUTH_STATE_TTL_SECONDS = 600;

type OAuthStatePayload = {
  userId: string;
  createdAt: string;
};

export async function createGoogleOAuthState(userId: string): Promise<string> {
  const state = randomBytes(24).toString("base64url");
  const redis = getRedisClient();
  const payload: OAuthStatePayload = {
    userId,
    createdAt: new Date().toISOString(),
  };

  if (redis) {
    await redis.set(`google-oauth-state:${state}`, payload, { ex: OAUTH_STATE_TTL_SECONDS });
    return state;
  }

  // Dev fallback: encode payload in state (less secure; document for local only)
  return Buffer.from(JSON.stringify({ ...payload, state }), "utf8").toString("base64url");
}

function coercePayload(raw: unknown): OAuthStatePayload | null {
  if (!raw) return null;
  // Upstash REST may return the stored JSON object directly OR as a string,
  // depending on client version and how the value was serialized.
  if (typeof raw === "string") {
    try {
      const parsed = JSON.parse(raw) as OAuthStatePayload;
      return parsed?.userId ? parsed : null;
    } catch {
      return null;
    }
  }
  if (typeof raw === "object" && raw !== null && "userId" in raw) {
    const payload = raw as OAuthStatePayload;
    return payload.userId ? payload : null;
  }
  return null;
}

export async function consumeGoogleOAuthState(state: string): Promise<string | null> {
  const redis = getRedisClient();
  if (redis) {
    const raw = await redis.get(`google-oauth-state:${state}`);
    const payload = coercePayload(raw);
    if (!payload) {
      console.warn("[google-oauth-state] state not found or invalid in Redis", {
        statePrefix: state.slice(0, 6),
        hadRaw: raw !== null && raw !== undefined,
        rawType: typeof raw,
      });
      return null;
    }
    await redis.del(`google-oauth-state:${state}`);
    return payload.userId;
  }

  try {
    const decoded = JSON.parse(Buffer.from(state, "base64url").toString("utf8")) as OAuthStatePayload & {
      state?: string;
    };
    return decoded.userId ?? null;
  } catch {
    return null;
  }
}
