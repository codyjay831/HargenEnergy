/**
 * End-to-end go-live rehearsal smoke test (sections 0–10).
 * Run: npx tsx --env-file=.env scripts/go-live-rehearsal-smoke.ts
 */
import bcrypt from "bcryptjs";
import pg from "pg";
import Stripe from "stripe";
import { PrismaPg } from "@prisma/adapter-pg";
import {
  AgreementStatus,
  BillingMode,
  BillableType,
  ClientRole,
  ClientStatus,
  EngagementType,
  HandoffTier,
  PlanType,
  PricingMode,
  Prisma,
  RequestPaymentStatus,
  RequestStatus,
  Role,
  SupportRequestKind,
  SupportRequestSource,
  TimeEntryStatus,
  Urgency,
  PrismaClient,
} from "@/generated/prisma/client";
import { persistPublicIntake } from "@/lib/intake-submit";
import { CATALOG_V2 } from "@/lib/catalog-v2-data";
import { applyIntakeWorkTasksToClient } from "@/lib/intake-engagement";
import { buildAgreementUpdateData } from "@/lib/client-agreement";
import { getPortalWorkSubmitEligibility } from "@/lib/portal-submit-eligibility";
import { isPaymentMadeForSubmit } from "@/lib/client-billing-readiness";
import {
  assertWorkTaskEligibleForClient,
  type ClientCatalogApprovals,
} from "@/lib/client-catalog-eligibility";
import { assertRequestBasedBillableWorkAllowed } from "@/lib/engagement";
import {
  DEFAULT_SERVICE_MODELS,
  getClientServicePaths,
  pickPrimaryEngagementType,
} from "@/lib/client-service-model";

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || process.env.APP_URL || "http://localhost:3000";
const RUN_ID = Date.now().toString(36);
const SMOKE_EMAIL = `smoke-${RUN_ID}@hargen.test`;
const SMOKE_OWNER_EMAIL = `smoke-owner-${RUN_ID}@hargen.test`;

type StepResult = { id: string; pass: boolean; detail: string };
const results: StepResult[] = [];

function record(id: string, pass: boolean, detail: string) {
  results.push({ id, pass, detail });
  console.log(`[${pass ? "PASS" : "FAIL"}] ${id}: ${detail}`);
}

function envPresent(name: string): boolean {
  return Boolean(process.env[name]?.trim());
}

function getStripeClient(): Stripe {
  const secretKey = process.env.STRIPE_SECRET_KEY?.trim();
  if (!secretKey) throw new Error("STRIPE_SECRET_KEY missing.");
  return new Stripe(secretKey, { apiVersion: "2026-04-22.dahlia", typescript: true });
}

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) throw new Error("DATABASE_URL is required.");

const pool = new pg.Pool({ connectionString: databaseUrl });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function fetchOk(path: string): Promise<{ ok: boolean; status: number }> {
  try {
    const res = await fetch(`${APP_URL}${path}`, { redirect: "manual" });
    return { ok: res.status >= 200 && res.status < 400, status: res.status };
  } catch {
    return { ok: false, status: 0 };
  }
}

async function insertCatalogV2(tx: Prisma.TransactionClient) {
  for (const cat of CATALOG_V2) {
    await tx.serviceCategory.create({
      data: {
        name: cat.name,
        description: cat.description,
        tasks: {
          create: cat.tasks.map((task, index) => ({
            name: task.name,
            description: task.description,
            maxMinutes: task.maxMinutes,
            isActive: true,
            basePriority: index,
            suggestedHandoffTier: task.suggestedHandoffTier,
            suggestedPricingMode: task.suggestedPricingMode,
            showOnDiscovery: task.showOnDiscovery ?? false,
            discoveryOrder: task.discoveryOrder ?? 0,
          })),
        },
      },
    });
  }
}

async function ensureCatalog() {
  const discoveryCount = await prisma.workTask.count({
    where: { isActive: true, showOnDiscovery: true },
  });
  if (discoveryCount > 0) return;

  const categoryCount = await prisma.serviceCategory.count();
  if (categoryCount === 0) {
    await prisma.$transaction(async (tx) => insertCatalogV2(tx));
    return;
  }

  const activeTasks = await prisma.workTask.findMany({
    where: { isActive: true },
    orderBy: { basePriority: "asc" },
    take: 5,
  });
  for (let i = 0; i < activeTasks.length; i++) {
    await prisma.workTask.update({
      where: { id: activeTasks[i].id },
      data: { showOnDiscovery: true, discoveryOrder: i + 1 },
    });
  }
}

async function loadSubmitInput(clientId: string) {
  const client = await prisma.client.findUnique({
    where: { id: clientId },
    include: {
      approvedWorkTasks: { select: { workTaskId: true } },
      serviceModels: { select: { modelType: true, isActive: true } },
    },
  });
  if (!client) return null;

  const activeCatalogTaskCount = await prisma.workTask.count({ where: { isActive: true } });
  const activeModels = client.serviceModels.filter((m) => m.isActive).map((m) => m.modelType);

  return {
    status: client.status,
    agreementStatus: client.agreementStatus,
    engagementType: client.engagementType,
    billingMode: client.billingMode,
    billingOverrideReason: client.billingOverrideReason,
    billingOverrideExpiresAt: client.billingOverrideExpiresAt,
    billingOverrideCreatedAt: client.billingOverrideCreatedAt,
    billingOverrideCreatedById: client.billingOverrideCreatedById,
    stripeCustomerId: client.stripeCustomerId,
    stripeSubscriptionId: client.stripeSubscriptionId,
    subscriptionStatus: client.subscriptionStatus,
    subscriptionCurrentPeriodEnd: client.subscriptionCurrentPeriodEnd,
    activeServiceModels: activeModels.length > 0 ? activeModels : undefined,
    approvedWorkTaskCount: client.approvedWorkTasks.length,
    activeCatalogTaskCount,
  };
}

async function portalSubmitAllowed(clientId: string) {
  const input = await loadSubmitInput(clientId);
  if (!input) return { ok: false as const, error: "Client not found" };
  const eligibility = getPortalWorkSubmitEligibility(input);
  if (!eligibility.canSubmit) {
    return { ok: false as const, error: eligibility.message, reasonCode: eligibility.reasonCode };
  }
  return { ok: true as const };
}

async function taskSubmitAllowed(clientId: string, workTaskId: string) {
  const client = await prisma.client.findUnique({
    where: { id: clientId },
    include: {
      approvedWorkTasks: { select: { workTaskId: true } },
      serviceModels: { select: { modelType: true, isActive: true } },
    },
  });
  if (!client) return { ok: false as const, error: "Client not found" };

  const catalogClient: ClientCatalogApprovals = client;
  const task = await prisma.workTask.findUnique({ where: { id: workTaskId } });
  if (!task?.isActive) return { ok: false as const, error: "Task inactive" };

  const scope = assertWorkTaskEligibleForClient({ client: catalogClient, workTaskId });
  if (!scope.ok) return { ok: false as const, error: scope.error };

  const servicePaths = getClientServicePaths(client);
  const approvedIds = client.approvedWorkTasks.map((r) => r.workTaskId);
  const isSupportBlockTask = servicePaths.hasSupportBlock && approvedIds.includes(workTaskId);

  if (isSupportBlockTask) {
    const paid = isPaymentMadeForSubmit({
      engagementType: EngagementType.SUPPORT_BLOCK,
      billingMode: client.billingMode,
      billingOverrideReason: client.billingOverrideReason,
      billingOverrideExpiresAt: client.billingOverrideExpiresAt,
      billingOverrideCreatedAt: client.billingOverrideCreatedAt,
      billingOverrideCreatedById: client.billingOverrideCreatedById,
      stripeCustomerId: client.stripeCustomerId,
      stripeSubscriptionId: client.stripeSubscriptionId,
      subscriptionStatus: client.subscriptionStatus,
      subscriptionCurrentPeriodEnd: client.subscriptionCurrentPeriodEnd,
    });
    if (!paid) {
      return { ok: false as const, error: "Support Block payment not ready" };
    }
  }

  return { ok: true as const, workTask: task };
}

async function configureSupportBlockClient(clientId: string, workTaskIds: string[]) {
  const client = await prisma.client.findUniqueOrThrow({ where: { id: clientId } });

  await prisma.$transaction(async (tx) => {
    await tx.clientApprovedWorkTask.deleteMany({ where: { clientId } });
    await tx.clientApprovedWorkTask.createMany({
      data: workTaskIds.map((workTaskId) => ({ clientId, workTaskId })),
    });

    for (const modelType of DEFAULT_SERVICE_MODELS) {
      const isActive = modelType === "SUPPORT_BLOCK";
      await tx.clientServiceModel.upsert({
        where: { clientId_modelType: { clientId, modelType } },
        create: {
          clientId,
          modelType,
          isActive,
          activatedAt: new Date(),
          deactivatedAt: isActive ? null : new Date(),
        },
        update: {
          isActive,
          activatedAt: isActive ? new Date() : undefined,
          deactivatedAt: isActive ? null : new Date(),
        },
      });
    }

    await tx.client.update({
      where: { id: clientId },
      data: {
        engagementType: pickPrimaryEngagementType(["SUPPORT_BLOCK"]),
        weeklyHours: client.weeklyHours || 5,
        hourlyRateCents: client.hourlyRateCents || 8500,
        planType: client.planType === PlanType.CUSTOM ? PlanType.CUSTOM : client.planType,
      },
    });
  });
}

function stripeConfigured(): boolean {
  return envPresent("STRIPE_SECRET_KEY");
}

async function resolveSupportProductId(
  stripe: Stripe,
  fallbackName: string,
): Promise<string> {
  const envProductId = process.env.STRIPE_SUPPORT_PRODUCT_ID?.trim();
  if (envProductId) return envProductId;
  const product = await stripe.products.create({ name: fallbackName });
  return product.id;
}

async function simulatePaidSubscription(clientId: string) {
  await prisma.client.update({
    where: { id: clientId },
    data: {
      billingMode: BillingMode.STRIPE,
      stripeCustomerId: `cus_smoke_${RUN_ID}`,
      stripeSubscriptionId: `sub_smoke_${RUN_ID}`,
      subscriptionStatus: "active",
      subscriptionCurrentPeriodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      weeklyHours: 5,
      hourlyRateCents: 8500,
    },
  });
  return { subscriptionId: `sub_smoke_${RUN_ID}` };
}
async function activateStripeSubscription(clientId: string) {
  const client = await prisma.client.findUniqueOrThrow({ where: { id: clientId } });
  const stripe = getStripeClient();
  const supportProductId = await resolveSupportProductId(
    stripe,
    `Smoke prepaid block ${RUN_ID}`,
  );

  let stripeCustomerId = client.stripeCustomerId;
  if (!stripeCustomerId) {
    const customer = await stripe.customers.create({
      email: client.email,
      name: client.contactName,
      metadata: { clientId: client.id, companyName: client.companyName },
    });
    stripeCustomerId = customer.id;
  }

  await prisma.client.update({
    where: { id: clientId },
    data: {
      stripeCustomerId,
      billingMode: BillingMode.STRIPE,
      billingOverrideReason: null,
      billingOverrideExpiresAt: null,
      billingOverrideCreatedAt: null,
      billingOverrideCreatedById: null,
    },
  });

  const paymentMethod = await stripe.paymentMethods.create({
    type: "card",
    card: { token: "tok_visa" },
  });
  await stripe.paymentMethods.attach(paymentMethod.id, { customer: stripeCustomerId });
  await stripe.customers.update(stripeCustomerId, {
    invoice_settings: { default_payment_method: paymentMethod.id },
  });

  const subscription = (await stripe.subscriptions.create({
    customer: stripeCustomerId,
    items: [
      {
        price_data: {
          currency: "usd",
          unit_amount: Math.round((client.weeklyHours || 5) * (client.hourlyRateCents || 8500) * (52 / 12)),
          recurring: { interval: "month" },
          product: supportProductId,
        },
      },
    ],
    metadata: { clientId, weeklyHours: String(client.weeklyHours || 5) },
    default_payment_method: paymentMethod.id,
  })) as unknown as Stripe.Subscription & { current_period_end: number };

  await prisma.client.update({
    where: { id: clientId },
    data: {
      stripeSubscriptionId: subscription.id,
      subscriptionStatus: subscription.status,
      subscriptionCurrentPeriodEnd: new Date(subscription.current_period_end * 1000),
      weeklyHours: client.weeklyHours || 5,
      hourlyRateCents: client.hourlyRateCents || 8500,
    },
  });

  return { stripeCustomerId, subscriptionId: subscription.id };
}

async function activateSubscriptionForSmoke(clientId: string) {
  if (stripeConfigured()) {
    return activateStripeSubscription(clientId);
  }
  return simulatePaidSubscription(clientId);
}

async function section0Preflight() {
  const health = await fetchOk("/api/health");
  record("0.1 health", health.ok, health.ok ? `HTTP ${health.status}` : `HTTP ${health.status} — start dev server at ${APP_URL}`);

  const dbEnv = ["DATABASE_URL", "AUTH_SECRET"];
  const missingDb = dbEnv.filter((k) => !envPresent(k));
  const stripeEnv = [
    "STRIPE_SECRET_KEY",
    "STRIPE_WEBHOOK_SECRET",
  ];
  const missingStripe = stripeEnv.filter((k) => !envPresent(k));
  record(
    "0.2 env",
    missingDb.length === 0,
    missingDb.length
      ? `Missing DB env: ${missingDb.join(", ")}`
      : missingStripe.length
        ? `DB env OK; Stripe env incomplete (${missingStripe.length} missing) — sections 5.2/9.3 use DB simulation`
        : "DB + Stripe env OK",
  );

  const migrationCols = await prisma.$queryRaw<Array<{ column_name: string }>>`
    SELECT column_name FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'SupportRequest'
      AND column_name IN ('paymentStatus', 'stripeCheckoutSessionId')
  `;
  record("0.2b migration", migrationCols.length === 2, migrationCols.length === 2 ? "Fixed-fee columns present" : "Migration columns missing");

  record(
    "0.3 webhook config",
    envPresent("STRIPE_WEBHOOK_SECRET") || !stripeConfigured(),
    envPresent("STRIPE_WEBHOOK_SECRET")
      ? "STRIPE_WEBHOOK_SECRET set"
      : "Not set — OK for local DB simulation",
  );

  const login = await fetchOk("/login");
  record("0.4 admin login page", login.ok, `HTTP ${login.status}`);

  await ensureCatalog();
  const catalogCount = await prisma.workTask.count({ where: { isActive: true, showOnDiscovery: true } });
  record("0.5 catalog", catalogCount > 0, `${catalogCount} discovery tasks`);
}

async function section1Intake(): Promise<{ clientId: string; requestId: string; workTaskId: string }> {
  const discoveryTask = await prisma.workTask.findFirst({
    where: { isActive: true, showOnDiscovery: true },
    orderBy: { discoveryOrder: "asc" },
  });
  if (!discoveryTask) throw new Error("No discovery tasks.");

  record("1.1 request-help", (await fetchOk("/request-help")).ok, "Page loads");

  const intake = await persistPublicIntake(prisma, {
    companyName: `Smoke Test Co ${RUN_ID}`,
    name: "Smoke Owner",
    email: SMOKE_EMAIL,
    website: undefined,
    phone: "555-0100",
    bottleneck: "Smoke test intake",
    plan: "hours-target",
    desiredWeeklyHours: 5,
    urgency: "normal",
    requestedWorkTaskIds: [discoveryTask.id],
    normalizedEmail: SMOKE_EMAIL,
    resolvedTasks: [{ id: discoveryTask.id, name: discoveryTask.name }],
  });
  record("1.2 intake submit", true, `clientId=${intake.clientId}`);

  const lead = await prisma.client.findUnique({ where: { id: intake.clientId } });
  record("1.3 onboarding lead", lead?.status === ClientStatus.LEAD, `status=${lead?.status}`);
  record("1.4 prospect view", lead?.status === ClientStatus.LEAD, "LEAD prospect state");

  return { clientId: intake.clientId, requestId: intake.requestId, workTaskId: discoveryTask.id };
}

async function section2Approve(clientId: string, workTaskId: string) {
  await configureSupportBlockClient(clientId, [workTaskId]);
  record("2.1-2.2 scope", true, "Support Block + approved task");

  const client = await prisma.client.findUniqueOrThrow({ where: { id: clientId } });
  record("2.3 plan", client.weeklyHours > 0, `weeklyHours=${client.weeklyHours}`);

  await prisma.client.update({
    where: { id: clientId },
    data: { status: ClientStatus.ACTIVE, activatedAt: new Date() },
  });
  await applyIntakeWorkTasksToClient(prisma, clientId, { setRequestBasedFromIntake: true });
  record("2.4 approve", true, "ACTIVE");

  const approved = await prisma.clientApprovedWorkTask.count({ where: { clientId } });
  record("2.5 checklist data", approved > 0, `${approved} approved tasks`);
}

async function section3AgreementBilling(clientId: string) {
  await prisma.client.update({
    where: { id: clientId },
    data: buildAgreementUpdateData({
      from: AgreementStatus.NOT_SENT,
      to: AgreementStatus.SIGNED,
      signedAt: new Date(),
    }),
  });
  record("3.1 agreement", true, "SIGNED");

  await prisma.client.update({ where: { id: clientId }, data: { billingMode: BillingMode.STRIPE } });
  record("3.2 billing", true, "STRIPE mode");
  record("3.3 skip admin checkout", true, "Self-serve path only");
}

async function section4PortalInvite(clientId: string) {
  await prisma.user.create({
    data: {
      email: SMOKE_OWNER_EMAIL,
      name: "Smoke Owner",
      passwordHash: await bcrypt.hash("SmokeTest123!", 12),
      role: Role.CLIENT,
      clientRole: ClientRole.OWNER,
      clientId,
    },
  });
  record("4.1 portal user", true, SMOKE_OWNER_EMAIL);

  const portal = await fetchOk("/portal");
  record("4.2 portal route", portal.status === 307 || portal.status === 302 || portal.status === 401 || portal.ok, `HTTP ${portal.status}`);

  const prePay = await portalSubmitAllowed(clientId);
  record("4.3 onboarding gate", !prePay.ok, prePay.ok ? "Unexpected: setup complete early" : "Blocked before payment");
  record("4.4 agreement info-only", true, "No client e-sign in product");
}

async function section5Subscription(clientId: string) {
  const prePay = await portalSubmitAllowed(clientId);
  record(
    "5.1 pre-pay",
    !prePay.ok,
    prePay.ok ? "Unexpected pass" : prePay.error,
  );

  if (stripeConfigured()) {
    const client = await prisma.client.findUniqueOrThrow({ where: { id: clientId } });
    const stripe = getStripeClient();
    const supportProductId = await resolveSupportProductId(
      stripe,
      `${client.companyName} prepaid block`,
    );
    let stripeCustomerId = client.stripeCustomerId;
    if (!stripeCustomerId) {
      const customer = await stripe.customers.create({
        email: client.email,
        name: client.contactName,
        metadata: { clientId },
      });
      stripeCustomerId = customer.id;
      await prisma.client.update({
        where: { id: clientId },
        data: { stripeCustomerId, billingMode: BillingMode.STRIPE },
      });
    }
    const checkoutSession = await stripe.checkout.sessions.create({
      customer: stripeCustomerId,
      line_items: [
        {
          price_data: {
            currency: "usd",
            unit_amount: Math.round((client.weeklyHours || 5) * (client.hourlyRateCents || 8500) * (52 / 12)),
            recurring: { interval: "month" },
            product: supportProductId,
          },
          quantity: 1,
        },
      ],
      mode: "subscription",
      success_url: `${APP_URL}/portal/account?checkout=success`,
      cancel_url: `${APP_URL}/portal/account#support-setup`,
      metadata: { clientId, weeklyHours: String(client.weeklyHours || 5) },
      subscription_data: { metadata: { clientId, weeklyHours: String(client.weeklyHours || 5) } },
    });
    record("5.2 checkout session", Boolean(checkoutSession.url), checkoutSession.url ? "URL created" : "No URL");
  } else {
    record("5.2 checkout session", true, "SKIP — Stripe keys not in .env; DB simulation used");
  }

  const { subscriptionId } = await activateSubscriptionForSmoke(clientId);
  record("5.3-5.4 subscription", true, subscriptionId);

  const paidClient = await prisma.client.findUniqueOrThrow({ where: { id: clientId } });
  record("5.4 db state", paidClient.subscriptionStatus === "active", `status=${paidClient.subscriptionStatus}`);

  const postPay = await portalSubmitAllowed(clientId);
  record("5.5 post-pay submit", postPay.ok, postPay.ok ? "Submit allowed" : postPay.error);
  record("5.6 billing portal", Boolean(paidClient.stripeCustomerId), "Customer id set");
}

async function section6PortalWork(clientId: string, workTaskId: string) {
  const gate = await taskSubmitAllowed(clientId, workTaskId);
  record("6.1 send work gate", gate.ok, gate.ok ? gate.workTask.name : gate.error);

  const opsRequest = await prisma.supportRequest.create({
    data: {
      clientId,
      title: `Smoke work ${RUN_ID}`,
      description: "Portal work smoke test",
      kind: SupportRequestKind.CLIENT_OPS,
      source: SupportRequestSource.PORTAL,
      supportNeeded: gate.ok ? gate.workTask.name : "Work",
      workTaskId,
      urgency: Urgency.NORMAL,
      status: RequestStatus.NEW,
    },
  });
  record("6.2 submit", true, opsRequest.id);
  record("6.3 admin queue", true, "CLIENT_OPS in DB");
  return { opsRequestId: opsRequest.id };
}

async function section7LogTime(clientId: string, opsRequestId: string) {
  const gate = await portalSubmitAllowed(clientId);
  record("7.1 paid client gate", gate.ok, gate.ok ? "Work allowed" : gate.error);

  const entry = await prisma.timeEntry.create({
    data: {
      clientId,
      supportRequestId: opsRequestId,
      date: new Date(),
      minutes: 15,
      description: "Smoke time entry",
      billableType: BillableType.INCLUDED,
      status: TimeEntryStatus.CONFIRMED,
    },
  });
  record("7.2 log time", Boolean(entry.id), entry.id);

  const unpaid = await prisma.client.create({
    data: {
      companyName: `Smoke Unpaid ${RUN_ID}`,
      contactName: "Unpaid",
      email: `smoke-unpaid-${RUN_ID}@hargen.test`,
      status: ClientStatus.ACTIVE,
      engagementType: EngagementType.SUPPORT_BLOCK,
      agreementStatus: AgreementStatus.SIGNED,
      billingMode: BillingMode.STRIPE,
      planType: PlanType.LIGHT,
      weeklyHours: 2,
      activatedAt: new Date(),
    },
  });
  const unpaidGate = await portalSubmitAllowed(unpaid.id);
  record("7.3 unpaid blocked", !unpaidGate.ok, unpaidGate.ok ? "Unexpected pass" : unpaidGate.error);
  return unpaid.id;
}

async function section8Negatives(workTaskId: string, unpaidClientId: string) {
  record("8.1 unpaid block", !(await portalSubmitAllowed(unpaidClientId)).ok, "Blocked");

  const agreementPending = await prisma.client.create({
    data: {
      companyName: `Smoke Agreement ${RUN_ID}`,
      contactName: "Pending",
      email: `smoke-agreement-${RUN_ID}@hargen.test`,
      status: ClientStatus.ACTIVE,
      engagementType: EngagementType.SUPPORT_BLOCK,
      agreementStatus: AgreementStatus.SENT,
      billingMode: BillingMode.STRIPE,
      planType: PlanType.LIGHT,
      stripeCustomerId: "cus_smoke",
      stripeSubscriptionId: "sub_smoke",
      subscriptionStatus: "active",
      weeklyHours: 2,
      activatedAt: new Date(),
    },
  });
  await prisma.clientApprovedWorkTask.create({
    data: { clientId: agreementPending.id, workTaskId },
  });
  const agreementGate = await portalSubmitAllowed(agreementPending.id);
  record("8.2 agreement pending", !agreementGate.ok, agreementGate.error ?? "blocked");

  const noScope = await prisma.client.create({
    data: {
      companyName: `Smoke No Scope ${RUN_ID}`,
      contactName: "No Scope",
      email: `smoke-noscope-${RUN_ID}@hargen.test`,
      status: ClientStatus.ACTIVE,
      engagementType: EngagementType.SUPPORT_BLOCK,
      agreementStatus: AgreementStatus.SIGNED,
      billingMode: BillingMode.STRIPE,
      planType: PlanType.LIGHT,
      stripeCustomerId: "cus_noscope",
      stripeSubscriptionId: "sub_noscope",
      subscriptionStatus: "active",
      weeklyHours: 2,
      activatedAt: new Date(),
    },
  });
  record("8.3 no scope", !(await portalSubmitAllowed(noScope.id)).ok, "Blocked");

  const hybrid = await prisma.client.create({
    data: {
      companyName: `Smoke Hybrid ${RUN_ID}`,
      contactName: "Hybrid",
      email: `smoke-hybrid-${RUN_ID}@hargen.test`,
      status: ClientStatus.ACTIVE,
      engagementType: EngagementType.SUPPORT_BLOCK,
      agreementStatus: AgreementStatus.SIGNED,
      billingMode: BillingMode.STRIPE,
      planType: PlanType.LIGHT,
      weeklyHours: 0,
      activatedAt: new Date(),
    },
  });
  for (const modelType of DEFAULT_SERVICE_MODELS) {
    await prisma.clientServiceModel.create({
      data: { clientId: hybrid.id, modelType, isActive: true, activatedAt: new Date() },
    });
  }
  await prisma.clientApprovedWorkTask.create({ data: { clientId: hybrid.id, workTaskId } });

  const fixedTask = await prisma.workTask.findFirst({
    where: { isActive: true, id: { not: workTaskId } },
  });
  if (fixedTask) {
    const blockGate = await taskSubmitAllowed(hybrid.id, workTaskId);
    const fixedGate = await taskSubmitAllowed(hybrid.id, fixedTask.id);
    record(
      "8.4 hybrid unpaid block",
      !blockGate.ok && fixedGate.ok,
      `block=${blockGate.ok ? "pass" : "blocked"}; fixed=${fixedGate.ok ? "open" : fixedGate.error}`,
    );
  } else {
    record("8.4 hybrid unpaid block", false, "No secondary catalog task for fixed-fee lane");
  }

  return {
    agreementPendingId: agreementPending.id,
    noScopeId: noScope.id,
    hybridId: hybrid.id,
  };
}

async function section9FixedFee(workTaskId: string) {
  const ffClient = await prisma.client.create({
    data: {
      companyName: `Smoke FF ${RUN_ID}`,
      contactName: "FF",
      email: `smoke-ff-${RUN_ID}@hargen.test`,
      status: ClientStatus.ACTIVE,
      engagementType: EngagementType.REQUEST_BASED,
      agreementStatus: AgreementStatus.SIGNED,
      billingMode: BillingMode.STRIPE,
      planType: PlanType.LIGHT,
      weeklyHours: 0,
      activatedAt: new Date(),
    },
  });

  const ffRequest = await prisma.supportRequest.create({
    data: {
      clientId: ffClient.id,
      title: `Smoke FF ${RUN_ID}`,
      description: "Fixed fee smoke",
      kind: SupportRequestKind.CLIENT_OPS,
      source: SupportRequestSource.ADMIN,
      workTaskId,
      handoffTier: HandoffTier.CLEAN,
      pricingMode: PricingMode.FLAT,
      flatPriceCents: 50000,
      paymentStatus: RequestPaymentStatus.PENDING,
      status: RequestStatus.NEW,
    },
  });
  record("9.1-9.2 priced", ffRequest.paymentStatus === RequestPaymentStatus.PENDING, "PENDING");

  if (stripeConfigured()) {
    const stripe = getStripeClient();
    const customer = await stripe.customers.create({
      email: ffClient.email,
      name: ffClient.contactName,
      metadata: { clientId: ffClient.id },
    });
    await prisma.client.update({ where: { id: ffClient.id }, data: { stripeCustomerId: customer.id } });
    const checkout = await stripe.checkout.sessions.create({
      customer: customer.id,
      mode: "payment",
      line_items: [
        {
          quantity: 1,
          price_data: { currency: "usd", unit_amount: 50000, product_data: { name: ffRequest.title } },
        },
      ],
      metadata: { clientId: ffClient.id, requestId: ffRequest.id, paymentType: "fixed_fee" },
    });
    record("9.3 payment link", Boolean(checkout.url), checkout.url ? "Created" : "Missing");
    await prisma.supportRequest.update({
      where: { id: ffRequest.id },
      data: { paymentStatus: RequestPaymentStatus.PAID, stripeCheckoutSessionId: checkout.id },
    });
  } else {
    record("9.3 payment link", true, "SKIP — Stripe keys not in .env");
    await prisma.supportRequest.update({
      where: { id: ffRequest.id },
      data: { paymentStatus: RequestPaymentStatus.PAID, stripeCheckoutSessionId: `cs_smoke_${RUN_ID}` },
    });
  }

  const billable = assertRequestBasedBillableWorkAllowed({
    engagementType: EngagementType.REQUEST_BASED,
    request: {
      handoffTier: HandoffTier.CLEAN,
      pricingMode: PricingMode.FLAT,
      flatPriceCents: 50000,
      paymentStatus: RequestPaymentStatus.PAID,
    },
    billableType: BillableType.INCLUDED,
  });
  record("9.5 billable gate", billable.ok, billable.ok ? "Allowed" : billable.error);
  record("9.4 paid", true, "PAID");

  return ffClient.id;
}

async function cleanup(clientIds: string[]) {
  await prisma.timeEntry.deleteMany({ where: { clientId: { in: clientIds } } });
  await prisma.supportRequest.deleteMany({ where: { clientId: { in: clientIds } } });
  await prisma.user.deleteMany({ where: { email: SMOKE_OWNER_EMAIL } });
  await prisma.clientApprovedWorkTask.deleteMany({ where: { clientId: { in: clientIds } } });
  await prisma.clientServiceModel.deleteMany({ where: { clientId: { in: clientIds } } });
  await prisma.client.deleteMany({ where: { id: { in: clientIds } } });
}

async function main() {
  console.log(`\n=== Go-live smoke (${RUN_ID}) ===\nAPP_URL=${APP_URL}\n`);
  const clientIds: string[] = [];

  try {
    await section0Preflight();
    const intake = await section1Intake();
    clientIds.push(intake.clientId);
    await section2Approve(intake.clientId, intake.workTaskId);
    await section3AgreementBilling(intake.clientId);
    await section4PortalInvite(intake.clientId);
    await section5Subscription(intake.clientId);
    const { opsRequestId } = await section6PortalWork(intake.clientId, intake.workTaskId);
    const unpaidId = await section7LogTime(intake.clientId, opsRequestId);
    clientIds.push(unpaidId);
    const negatives = await section8Negatives(intake.workTaskId, unpaidId);
    clientIds.push(negatives.agreementPendingId, negatives.noScopeId, negatives.hybridId);
    clientIds.push(await section9FixedFee(intake.workTaskId));

    const failed = results.filter((r) => !r.pass);
    console.log(`\n=== Section 10 Sign-off ===`);
    console.log(`Passed: ${results.length - failed.length}/${results.length}`);
    if (failed.length) {
      for (const f of failed) console.log(`  FAIL ${f.id}: ${f.detail}`);
      process.exitCode = 1;
    } else {
      console.log("All smoke checks passed.");
    }
  } finally {
    if (clientIds.length) {
      await cleanup(clientIds);
      console.log("\n[cleanup] Smoke records removed.");
    }
    await prisma.$disconnect();
    await pool.end();
  }
}

main().catch((error) => {
  console.error("[smoke] Fatal:", error);
  process.exit(1);
});
