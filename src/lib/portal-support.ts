import {
  BillingMode,
  EngagementType,
  type PlanType,
} from "@/generated/prisma/client";
import { getEngagementLabel } from "@/lib/engagement";
import { getPortalWorkSubmitEligibility } from "@/lib/portal-submit-eligibility";
import type { PortalSubmitBlockReason } from "@/lib/portal-submit-eligibility";
import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";
import { assertClientScope } from "@/lib/auth-guards";
import type { Session } from "next-auth";

export type PortalSubmitCategory = {
  id: string;
  name: string;
  tasks: {
    id: string;
    name: string;
    description: string | null;
    requiredFields: unknown;
    requiredDocs: unknown;
  }[];
};

export type PortalSupportArea = {
  categoryName: string;
  tasks: { id: string; name: string }[];
};

export type ClientPortalSupportSetup = {
  engagementType: EngagementType;
  engagementLabel: string;
  isSupportBlock: boolean;
  isRequestBased: boolean;
  billingMode: BillingMode;
  billingOverrideReason: string | null;
  billingOverrideExpiresAt: Date | null;
  billingOverrideCreatedAt: Date | null;
  billingOverrideCreatedById: string | null;
  planType: PlanType;
  weeklyHours: number;
  subscriptionStatus: string | null;
  stripeCustomerId: string | null;
  stripeSubscriptionId: string | null;
  categories: PortalSubmitCategory[];
  supportAreas: PortalSupportArea[];
  canSubmit: boolean;
  blockReasonCode?: PortalSubmitBlockReason;
  blockMessage?: string;
};

const TASK_SELECT = {
  id: true,
  name: true,
  description: true,
  requiredFields: true,
  requiredDocs: true,
} as const;

function deriveSupportAreas(categories: PortalSubmitCategory[]): PortalSupportArea[] {
  return categories.map((c) => ({
    categoryName: c.name,
    tasks: c.tasks.map((t) => ({ id: t.id, name: t.name })),
  }));
}

function toPortalCategories(
  categories: Array<{
    id: string;
    name: string;
    tasks: PortalSubmitCategory["tasks"];
  }>,
): PortalSubmitCategory[] {
  return categories
    .map((c) => ({ id: c.id, name: c.name, tasks: c.tasks }))
    .filter((c) => c.tasks.length > 0);
}

export async function getClientPortalSupportSetup(
  clientId: string,
): Promise<ClientPortalSupportSetup | { error: "Client not found." }> {
  const client = await prisma.client.findUnique({
    where: { id: clientId },
    include: {
      approvedWorkTasks: { select: { workTaskId: true } },
    },
  });

  if (!client) {
    return { error: "Client not found." };
  }

  const isRequestBased = client.engagementType === EngagementType.REQUEST_BASED;
  const isSupportBlock = client.engagementType === EngagementType.SUPPORT_BLOCK;
  const activeCatalogTaskCount = await prisma.workTask.count({
    where: { isActive: true },
  });

  const approvedIds = client.approvedWorkTasks.map((a) => a.workTaskId);
  const activeApprovedWorkTaskCount =
    approvedIds.length === 0
      ? 0
      : await prisma.workTask.count({
          where: { isActive: true, id: { in: approvedIds } },
        });

  const submitEligibility = getPortalWorkSubmitEligibility({
    status: client.status,
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
    approvedWorkTaskCount: activeApprovedWorkTaskCount,
    activeCatalogTaskCount,
  });

  const base = {
    engagementType: client.engagementType,
    engagementLabel: getEngagementLabel(client.engagementType),
    isSupportBlock,
    isRequestBased,
    billingMode: client.billingMode,
    billingOverrideReason: client.billingOverrideReason,
    billingOverrideExpiresAt: client.billingOverrideExpiresAt,
    billingOverrideCreatedAt: client.billingOverrideCreatedAt,
    billingOverrideCreatedById: client.billingOverrideCreatedById,
    planType: client.planType,
    weeklyHours: client.weeklyHours,
    subscriptionStatus: client.subscriptionStatus,
    stripeCustomerId: client.stripeCustomerId,
    stripeSubscriptionId: client.stripeSubscriptionId,
    canSubmit: submitEligibility.canSubmit,
    blockReasonCode: submitEligibility.canSubmit
      ? undefined
      : submitEligibility.reasonCode,
    blockMessage: submitEligibility.canSubmit ? undefined : submitEligibility.message,
  };

  if (isRequestBased) {
    const rawCategories = await prisma.serviceCategory.findMany({
      where: { isActive: true },
      include: {
        tasks: {
          where: { isActive: true },
          orderBy: { basePriority: "asc" },
          select: TASK_SELECT,
        },
      },
      orderBy: { name: "asc" },
    });

    const categories = toPortalCategories(rawCategories);

    return {
      ...base,
      categories,
      supportAreas: [],
    };
  }

  if (approvedIds.length === 0) {
    return {
      ...base,
      categories: [],
      supportAreas: [],
    };
  }

  const rawCategories = await prisma.serviceCategory.findMany({
    where: { isActive: true },
    include: {
      tasks: {
        where: { id: { in: approvedIds }, isActive: true },
        orderBy: { basePriority: "asc" },
        select: TASK_SELECT,
      },
    },
    orderBy: { name: "asc" },
  });

  const categories = toPortalCategories(rawCategories);

  return {
    ...base,
    categories,
    supportAreas: deriveSupportAreas(categories),
  };
}

export async function getClientPortalSupportSetupForSession(
  clientId: string,
  sessionOverride?: Session,
): Promise<ClientPortalSupportSetup | { error: "Client not found." }> {
  const session = sessionOverride ?? (await auth());
  if (!session?.user) {
    throw new Error("Unauthorized.");
  }
  assertClientScope(session, clientId);
  return getClientPortalSupportSetup(clientId);
}
