import bcrypt from "bcryptjs";
import {
  ClientRole,
  ClientStatus,
  EngagementType,
  Role,
  StaffRole,
  SupportRequestKind,
  PrismaClient,
} from "@/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import pg from "pg";

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) {
  throw new Error("DATABASE_URL is required for seed-e2e.");
}

const pool = new pg.Pool({ connectionString: databaseUrl });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

function required(name: string) {
  const value = process.env[name]?.trim();
  if (!value) {
    throw new Error(`${name} is required for seed-e2e.`);
  }
  return value;
}

async function upsertUser(input: {
  email: string;
  name: string;
  password: string;
  role: Role;
  staffRole?: StaffRole | null;
  clientRole?: ClientRole | null;
  clientId?: string | null;
}) {
  const passwordHash = await bcrypt.hash(input.password, 12);

  return prisma.user.upsert({
    where: { email: input.email },
    update: {
      name: input.name,
      passwordHash,
      role: input.role,
      staffRole: input.staffRole ?? null,
      clientRole: input.clientRole ?? null,
      clientId: input.clientId ?? null,
      deactivatedAt: null,
      passwordChangedAt: new Date(),
    },
    create: {
      email: input.email,
      name: input.name,
      passwordHash,
      role: input.role,
      staffRole: input.staffRole ?? null,
      clientRole: input.clientRole ?? null,
      clientId: input.clientId ?? null,
    },
  });
}

async function main() {
  const adminEmail = required("E2E_ADMIN_EMAIL");
  const adminPassword = required("E2E_ADMIN_PASSWORD");
  const clientEmail = required("E2E_CLIENT_EMAIL");
  const clientPassword = required("E2E_CLIENT_PASSWORD");

  const activeClient = await prisma.client.upsert({
    where: { email: "e2e-client-company@hargen.test" },
    update: {
      companyName: "E2E Solar Co",
      contactName: "E2E Client Owner",
      status: ClientStatus.ACTIVE,
      engagementType: EngagementType.SUPPORT_BLOCK,
    },
    create: {
      companyName: "E2E Solar Co",
      contactName: "E2E Client Owner",
      email: "e2e-client-company@hargen.test",
      status: ClientStatus.ACTIVE,
      engagementType: EngagementType.SUPPORT_BLOCK,
      planType: "LIGHT",
      weeklyHours: 10,
      activatedAt: new Date(),
    },
  });

  await prisma.supportRequest.upsert({
    where: { id: "e2e-client-ops-request" },
    update: {
      clientId: activeClient.id,
      title: "E2E Client Ops Request",
      description: "Smoke test request seeded for responsive e2e coverage.",
      kind: SupportRequestKind.CLIENT_OPS,
    },
    create: {
      id: "e2e-client-ops-request",
      clientId: activeClient.id,
      title: "E2E Client Ops Request",
      description: "Smoke test request seeded for responsive e2e coverage.",
      kind: SupportRequestKind.CLIENT_OPS,
    },
  });

  const prospect = await prisma.client.upsert({
    where: { email: "e2e-prospect@hargen.test" },
    update: {
      companyName: "E2E Prospect Co",
      contactName: "E2E Prospect",
      status: ClientStatus.LEAD,
      engagementType: EngagementType.SUPPORT_BLOCK,
    },
    create: {
      companyName: "E2E Prospect Co",
      contactName: "E2E Prospect",
      email: "e2e-prospect@hargen.test",
      status: ClientStatus.LEAD,
      engagementType: EngagementType.SUPPORT_BLOCK,
      planType: "LIGHT",
    },
  });

  await prisma.supportRequest.upsert({
    where: { id: "e2e-prospect-request" },
    update: {
      clientId: prospect.id,
      title: "E2E Discovery Intake",
      description: "Prospect intake seeded for admin responsive tests.",
      kind: SupportRequestKind.PROSPECT_INTAKE,
    },
    create: {
      id: "e2e-prospect-request",
      clientId: prospect.id,
      title: "E2E Discovery Intake",
      description: "Prospect intake seeded for admin responsive tests.",
      kind: SupportRequestKind.PROSPECT_INTAKE,
    },
  });

  await upsertUser({
    email: adminEmail,
    name: "E2E Admin",
    password: adminPassword,
    role: Role.ADMIN,
    staffRole: StaffRole.OWNER,
  });

  await upsertUser({
    email: clientEmail,
    name: "E2E Client",
    password: clientPassword,
    role: Role.CLIENT,
    clientRole: ClientRole.OWNER,
    clientId: activeClient.id,
  });

  // Keep the process deterministic for CI logs.
  console.log("[seed-e2e] Seed completed.");
}

main()
  .catch((error) => {
    console.error("[seed-e2e] Failed:", error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
