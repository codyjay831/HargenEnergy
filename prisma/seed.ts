import { PrismaClient, Role } from "../src/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import pg from "pg";
import bcrypt from "bcryptjs";
import "dotenv/config";

async function main() {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    throw new Error("DATABASE_URL is required to seed the database.");
  }

  let prisma: PrismaClient;

  if (databaseUrl.startsWith("prisma://") || databaseUrl.startsWith("prisma+postgres://")) {
    prisma = new PrismaClient({ accelerateUrl: databaseUrl });
  } else {
    const pool = new pg.Pool({ connectionString: databaseUrl });
    const adapter = new PrismaPg(pool);
    prisma = new PrismaClient({ adapter });
  }

  const adminEmail = process.env.ADMIN_EMAIL?.trim();
  const adminPassword = process.env.ADMIN_PASSWORD;
  const adminName = (process.env.ADMIN_NAME ?? "").trim() || null;

  if (!adminEmail || !adminPassword) {
    console.error("ADMIN_EMAIL and ADMIN_PASSWORD environment variables are required.");
    process.exit(1);
  }

  const passwordHash = await bcrypt.hash(adminPassword, 10);

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

    console.log("Admin user upserted (single row by email; password hash refreshed).");
  } catch (error) {
    console.error("Error during seeding:", error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
