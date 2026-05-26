/**
 * Production migrate deploy with stale lock cleanup and retries.
 * Used by `npm run build` before `next build`.
 */
import "dotenv/config";
import { spawnSync } from "node:child_process";
import pg from "pg";
import { migrationDatabaseUrl } from "./migration-url.mjs";

const LOCK_OBJID = 72707369;
const MAX_ATTEMPTS = 3;
const RETRY_DELAY_MS = 12_000;

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function releaseStalePrismaLocks(client) {
  await client.query(
    `SELECT pg_terminate_backend(a.pid)
     FROM pg_locks l
     JOIN pg_stat_activity a ON a.pid = l.pid
     WHERE l.locktype = 'advisory'
       AND l.objid = $1
       AND a.pid <> pg_backend_pid()
       AND (a.state = 'idle' OR a.state = 'idle in transaction')`,
    [LOCK_OBJID],
  );
}

function runPrismaMigrateDeploy() {
  const result = spawnSync("npx", ["prisma", "migrate", "deploy"], {
    stdio: "inherit",
    shell: true,
    env: process.env,
  });
  return result.status ?? 1;
}

async function main() {
  const chosen = migrationDatabaseUrl();

  if (!chosen.url) {
    console.error("[migrate-deploy] No migration database URL configured.");
    process.exit(1);
  }

  let client;
  try {
    client = new pg.Client({ connectionString: chosen.url });
    await client.connect();
    await releaseStalePrismaLocks(client);
  } catch (error) {
    console.warn(
      "[migrate-deploy] Pre-migrate lock cleanup failed; continuing with migrate deploy:",
      error instanceof Error ? error.message : error,
    );
  } finally {
    if (client) {
      await client.end().catch(() => {});
    }
  }

  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    const exitCode = runPrismaMigrateDeploy();
    if (exitCode === 0) {
      process.exit(0);
    }

    if (attempt < MAX_ATTEMPTS) {
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

  process.exit(1);
}

main().catch((error) => {
  console.error("[migrate-deploy] Fatal error:", error);
  process.exit(1);
});
