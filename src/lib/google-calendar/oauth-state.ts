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

export async function consumeGoogleOAuthState(state: string): Promise<string | null> {
  const redis = getRedisClient();
  if (redis) {
    const payload = await redis.get<OAuthStatePayload>(`google-oauth-state:${state}`);
    if (!payload?.userId) {
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
