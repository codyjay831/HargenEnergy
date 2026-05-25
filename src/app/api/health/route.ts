import { NextResponse } from "next/server";
import { Redis } from "@upstash/redis";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET() {
  const checks: {
    db: { ok: boolean; detail?: string };
    redis: { ok: boolean; detail?: string; configured: boolean };
  } = {
    db: { ok: false },
    redis: { ok: false, configured: false },
  };

  try {
    await prisma.$queryRaw`SELECT 1`;
    checks.db = { ok: true };
  } catch (error) {
    console.error("Health check DB failed:", error);
    checks.db = { ok: false, detail: "Database query failed." };
  }

  const redisUrl = process.env.UPSTASH_REDIS_REST_URL?.trim();
  const redisToken = process.env.UPSTASH_REDIS_REST_TOKEN?.trim();
  if (redisUrl && redisToken) {
    checks.redis.configured = true;
    try {
      const redis = new Redis({ url: redisUrl, token: redisToken });
      await redis.get("hargen:health:probe");
      checks.redis = { ok: true, configured: true };
    } catch (error) {
      console.error("Health check Redis failed:", error);
      checks.redis = {
        ok: false,
        configured: true,
        detail: "Redis check failed.",
      };
    }
  } else {
    checks.redis = {
      ok: false,
      configured: false,
      detail: "Redis not configured.",
    };
  }

  const ok = checks.db.ok;
  return NextResponse.json(
    { ok, checks },
    { status: ok ? 200 : 503 },
  );
}
