export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    await import("../sentry.server.config");
  }
  if (process.env.NEXT_RUNTIME === "edge") {
    await import("../sentry.edge.config");
  }

  const isProdDeployment =
    process.env.NODE_ENV === "production" &&
    process.env.VERCEL_ENV === "production";

  if (!isProdDeployment) {
    return;
  }

  const hasRedis =
    !!process.env.UPSTASH_REDIS_REST_URL?.trim() &&
    !!process.env.UPSTASH_REDIS_REST_TOKEN?.trim();

  if (!hasRedis && process.env.RATE_LIMIT_ALLOW_MEMORY !== "1") {
    console.error(
      "[startup] Missing Upstash Redis credentials in production deployment. " +
        "Sensitive rate-limit buckets will fail closed and password stamp checks will use DB fallback.",
    );
  }
}
