/**
 * Production migrate deploy with diagnostics, stale lock cleanup, and retries.
 * Used by `npm run build` before `next build`.
 */
import "dotenv/config";
import { spawnSync } from "node:child_process";
import { appendFileSync } from "node:fs";
import pg from "pg";
import { hostFromUrl, migrationDatabaseUrl } from "./migration-url.mjs";

const LOCK_OBJID = 72707369;
const MAX_ATTEMPTS = 3;
const RETRY_DELAY_MS = 12_000;
const DEBUG_LOG = "debug-f332dc.log";

function agentLog(location, message, data, hypothesisId) {
  const payload = {
    sessionId: "f332dc",
    location,
    message,
    data,
    hypothesisId,
    timestamp: Date.now(),
    runId: process.env.VERCEL ? "vercel-build" : "local",
  };
  // #region agent log
  console.log("[migrate-debug]", JSON.stringify(payload));
  fetch("http://127.0.0.1:7490/ingest/ca2f0bff-e45e-43cc-bc2f-329025fe6fd9", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Debug-Session-Id": "f332dc",
    },
    body: JSON.stringify(payload),
  }).catch(() => {});
  try {
    appendFileSync(DEBUG_LOG, `${JSON.stringify(payload)}\n`);
  } catch {
    // ignore when log file unavailable (e.g. Vercel read-only except workspace)
  }
  // #endregion
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function inspectAdvisoryLocks(client) {
  const { rows } = await client.query(
    `SELECT l.pid, l.granted, a.application_name, a.state,
            EXTRACT(EPOCH FROM (NOW() - a.query_start))::int AS age_seconds,
            LEFT(a.query, 80) AS query_snippet
     FROM pg_locks l
     JOIN pg_stat_activity a ON a.pid = l.pid
     WHERE l.locktype = 'advisory' AND l.objid = $1
     ORDER BY a.query_start DESC NULLS LAST`,
    [LOCK_OBJID],
  );
  return rows;
}

async function releaseStalePrismaLocks(client) {
  const before = await inspectAdvisoryLocks(client);
  agentLog(
    "migrate-deploy.mjs:releaseStalePrismaLocks",
    "advisory lock holders before cleanup",
    { count: before.length, holders: before },
    "H1",
  );

  if (before.length === 0) {
    return { terminated: 0, before };
  }

  const { rowCount } = await client.query(
    `SELECT pg_terminate_backend(a.pid) AS terminated
     FROM pg_locks l
     JOIN pg_stat_activity a ON a.pid = l.pid
     WHERE l.locktype = 'advisory'
       AND l.objid = $1
       AND a.pid <> pg_backend_pid()
       AND (a.state = 'idle' OR a.state = 'idle in transaction')`,
    [LOCK_OBJID],
  );

  const after = await inspectAdvisoryLocks(client);
  agentLog(
    "migrate-deploy.mjs:releaseStalePrismaLocks",
    "advisory lock holders after cleanup",
    { terminated: rowCount ?? 0, remaining: after.length, holders: after },
    "H1",
  );

  return { terminated: rowCount ?? 0, before, after };
}

async function migrationTableStats(client) {
  const { rows } = await client.query(
    `SELECT
       COUNT(*) FILTER (WHERE finished_at IS NULL) AS in_progress,
       COUNT(*) FILTER (WHERE rolled_back_at IS NOT NULL) AS rolled_back,
       COUNT(*) AS total
     FROM _prisma_migrations`,
  );
  const recent = await client.query(
    `SELECT migration_name, finished_at, rolled_back_at, applied_steps_count
     FROM _prisma_migrations
     ORDER BY started_at DESC NULLS LAST
     LIMIT 3`,
  );
  return { stats: rows[0], recent: recent.rows };
}

function runPrismaMigrateDeploy(attempt) {
  agentLog(
    "migrate-deploy.mjs:runPrismaMigrateDeploy",
    "starting prisma migrate deploy",
    { attempt },
    "H2",
  );
  const result = spawnSync("npx", ["prisma", "migrate", "deploy"], {
    stdio: "inherit",
    shell: true,
    env: process.env,
  });
  agentLog(
    "migrate-deploy.mjs:runPrismaMigrateDeploy",
    "prisma migrate deploy finished",
    { attempt, exitCode: result.status ?? 1 },
    "H2",
  );
  return result.status ?? 1;
}

async function main() {
  const chosen = migrationDatabaseUrl();
  agentLog(
    "migrate-deploy.mjs:main",
    "resolved migration URL",
    {
      source: chosen.source,
      host: hostFromUrl(chosen.url),
      pooler: chosen.url.includes("-pooler."),
      vercel: !!process.env.VERCEL,
      gitSha: process.env.VERCEL_GIT_COMMIT_SHA?.slice(0, 7) ?? null,
    },
    "H3",
  );

  if (!chosen.url) {
    console.error("[migrate-deploy] No migration database URL configured.");
    process.exit(1);
  }

  let client;
  try {
    client = new pg.Client({ connectionString: chosen.url });
    const connectStarted = Date.now();
    await client.connect();
    agentLog(
      "migrate-deploy.mjs:main",
      "database connected",
      { connectMs: Date.now() - connectStarted },
      "H5",
    );

    const migrationStats = await migrationTableStats(client);
    agentLog(
      "migrate-deploy.mjs:main",
      "_prisma_migrations snapshot",
      migrationStats,
      "H4",
    );

    await releaseStalePrismaLocks(client);
  } catch (error) {
    agentLog(
      "migrate-deploy.mjs:main",
      "pre-migrate diagnostics failed",
      { error: error instanceof Error ? error.message : String(error) },
      "H5",
    );
    console.warn(
      "[migrate-deploy] Pre-migrate diagnostics failed; continuing with migrate deploy:",
      error instanceof Error ? error.message : error,
    );
  } finally {
    if (client) {
      await client.end().catch(() => {});
    }
  }

  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    const exitCode = runPrismaMigrateDeploy(attempt);
    if (exitCode === 0) {
      agentLog(
        "migrate-deploy.mjs:main",
        "migrate deploy succeeded",
        { attempt },
        "H2",
      );
      process.exit(0);
    }

    if (attempt < MAX_ATTEMPTS) {
      agentLog(
        "migrate-deploy.mjs:main",
        "migrate deploy failed; retrying",
        { attempt, retryDelayMs: RETRY_DELAY_MS },
        "H2",
      );
      console.warn(
        `[migrate-deploy] Attempt ${attempt}/${MAX_ATTEMPTS} failed; retrying in ${RETRY_DELAY_MS / 1000}s...`,
      );
      await sleep(RETRY_DELAY_MS);

      try {
        const retryClient = new pg.Client({ connectionString: chosen.url });
        await retryClient.connect();
        await releaseStalePrismaLocks(retryClient);
        await retryClient.end();
      } catch {
        // best-effort cleanup between retries
      }
    }
  }

  agentLog(
    "migrate-deploy.mjs:main",
    "migrate deploy exhausted retries",
    { attempts: MAX_ATTEMPTS },
    "H2",
  );
  process.exit(1);
}

main().catch((error) => {
  console.error("[migrate-deploy] Fatal error:", error);
  process.exit(1);
});
