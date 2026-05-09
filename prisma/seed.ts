/**
 * Optional manual seed utility.
 *
 * This script is NOT part of the routine production build. The preferred way
 * to bootstrap the first admin in production is the secure `/setup/admin`
 * route guarded by `ADMIN_SETUP_TOKEN`.
 *
 * This file is kept only as an emergency / local-development convenience to
 * upsert an admin user when `ADMIN_EMAIL` and `ADMIN_PASSWORD` are present.
 * It exits with a non-error status (skip) when those vars are missing so it
 * can be safely invoked from automation without blocking deploys.
 *
 * Run manually with:
 *   npm run prisma:seed
 */
import { PrismaClient, Role } from "../src/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import pg from "pg";
import bcrypt from "bcryptjs";
import "dotenv/config";

async function main() {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    console.warn("[seed] DATABASE_URL is missing. Skipping seed.");
    return;
  }

  const adminEmail = process.env.ADMIN_EMAIL?.trim();
  const adminPassword = process.env.ADMIN_PASSWORD;
  const adminName = (process.env.ADMIN_NAME ?? "").trim() || null;

  if (!adminEmail || !adminPassword) {
    console.warn(
      "[seed] ADMIN_EMAIL / ADMIN_PASSWORD not set. Skipping admin upsert. " +
        "Use /setup/admin in production to create the first admin.",
    );
    return;
  }

  let prisma: PrismaClient;

  if (
    databaseUrl.startsWith("prisma://") ||
    databaseUrl.startsWith("prisma+postgres://")
  ) {
    prisma = new PrismaClient({ accelerateUrl: databaseUrl });
  } else {
    const pool = new pg.Pool({ connectionString: databaseUrl });
    const adapter = new PrismaPg(pool);
    prisma = new PrismaClient({ adapter });
  }

  const passwordHash = await bcrypt.hash(adminPassword, 12);

  try {
    await prisma.user.upsert({
      where: { email: adminEmail },
      create: {
        email: adminEmail,
        name: adminName,
        passwordHash,
        role: Role.ADMIN,
      },
      update: {
        name: adminName,
        role: Role.ADMIN,
        passwordHash,
      },
    });

    console.log(
      "[seed] Admin user upserted (single row by email; password hash refreshed).",
    );
  } catch (error) {
    console.error("[seed] Error during seeding:", error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
