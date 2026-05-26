/** Shared migration URL resolution for Prisma CLI on Neon/Vercel. */

export function hostFromUrl(url) {
  if (!url?.trim()) return null;
  try {
    return new URL(url.replace(/^postgres:/, "postgresql:")).hostname;
  } catch {
    return null;
  }
}

export function ensureConnectTimeout(url) {
  if (/[?&]connect_timeout=/i.test(url)) {
    return url;
  }
  const separator = url.includes("?") ? "&" : "?";
  return `${url}${separator}connect_timeout=30`;
}

/** @returns {{ source: string, url: string }} */
export function migrationDatabaseUrl() {
  const candidates = [
    ["DIRECT_URL", process.env.DIRECT_URL],
    ["DATABASE_URL_UNPOOLED", process.env.DATABASE_URL_UNPOOLED],
    ["POSTGRES_URL_NON_POOLING", process.env.POSTGRES_URL_NON_POOLING],
    ["PGHOST_UNPOOLED", buildFromParts("PGHOST_UNPOOLED")],
    ["DATABASE_URL_derived", deriveFromDatabaseUrl()],
    ["DATABASE_URL", process.env.DATABASE_URL?.trim()],
  ];

  for (const [source, url] of candidates) {
    if (url?.trim()) {
      return { source, url: ensureConnectTimeout(url.trim()) };
    }
  }

  return { source: "missing", url: "" };
}

function deriveFromDatabaseUrl() {
  const databaseUrl = process.env.DATABASE_URL?.trim();
  if (!databaseUrl) return null;
  if (!databaseUrl.includes("-pooler.")) return null;
  return databaseUrl.replace("-pooler.", ".");
}

function buildFromParts(hostKey) {
  const host = process.env[hostKey]?.trim();
  if (!host) return null;
  const user = process.env.PGUSER || process.env.POSTGRES_USER;
  const password = process.env.PGPASSWORD || process.env.POSTGRES_PASSWORD;
  const database = process.env.PGDATABASE || process.env.POSTGRES_DATABASE;
  if (!user || !password || !database) return null;
  return `postgresql://${encodeURIComponent(user)}:${encodeURIComponent(password)}@${host}/${database}?sslmode=require`;
}
