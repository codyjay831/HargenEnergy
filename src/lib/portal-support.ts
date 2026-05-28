import {
  BillingMode,
  EngagementType,
  type PlanType,
} from "@/generated/prisma/client";
import { getEngagementLabel } from "@/lib/engagement";
import { getPortalWorkSubmitEligibility } from "@/lib/portal-submit-eligibility";
import type { PortalSubmitBlockReason } from "@/lib/portal-submit-eligibility";
import { deriveSubmitBlockerSummary } from "@/lib/submit-blockers";
import type { ServiceModelTypeValue } from "@/lib/client-service-model";
import { getClientCatalogEligibility } from "@/lib/client-catalog-eligibility";
import {
  loadCatalogTaskCounts,
  loadPortalCatalogCategories,
} from "@/lib/client-catalog-loader";
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
  activeServiceModels?: ServiceModelTypeValue[];
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
  allSubmitBlockers?: Array<{ reasonCode: PortalSubmitBlockReason; message: string }>;
};

function deriveSupportAreas(categories: PortalSubmitCategory[]): PortalSupportArea[] {
  return categories.map((c) => ({
    categoryName: c.name,
    tasks: c.tasks.map((t) => ({ id: t.id, name: t.name })),
  }));
}

export async function getClientPortalSupportSetup(
  clientId: string,
): Promise<ClientPortalSupportSetup | { error: "Client not found." }> {
  const client = await prisma.client.findUnique({
    where: { id: clientId },
    include: {
      approvedWorkTasks: { select: { workTaskId: true } },
      serviceModels: { select: { modelType: true, isActive: true } },
    },
  });

  if (!client) {
    return { error: "Client not found." };
  }

  const approvedIds = client.approvedWorkTasks.map((a) => a.workTaskId);
  const activeServiceModels = client.serviceModels
    .filter((item) => item.isActive)
    .map((item) => item.modelType);
  const catalogCounts = await loadCatalogTaskCounts(approvedIds);
  const catalogEligibility = getClientCatalogEligibility({
    engagementType: client.engagementType,
    activeServiceModels,
    activeCatalogTaskCount: catalogCounts.activeCatalogTaskCount,
    activeApprovedWorkTaskCount: catalogCounts.activeApprovedWorkTaskCount,
  });

  const submitBlockerInput = {
    status: client.status,
    agreementStatus: client.agreementStatus,
    engagementType: client.engagementType,
    activeServiceModels,
    billingMode: client.billingMode,
    billingOverrideReason: client.billingOverrideReason,
    billingOverrideExpiresAt: client.billingOverrideExpiresAt,
    billingOverrideCreatedAt: client.billingOverrideCreatedAt,
    billingOverrideCreatedById: client.billingOverrideCreatedById,
    stripeCustomerId: client.stripeCustomerId,
    stripeSubscriptionId: client.stripeSubscriptionId,
    subscriptionStatus: client.subscriptionStatus,
    subscriptionCurrentPeriodEnd: client.subscriptionCurrentPeriodEnd,
    approvedWorkTaskCount: catalogCounts.activeApprovedWorkTaskCount,
    activeCatalogTaskCount: catalogCounts.activeCatalogTaskCount,
  };

  const submitBlockers = deriveSubmitBlockerSummary(submitBlockerInput);
  const submitEligibility = getPortalWorkSubmitEligibility(submitBlockerInput);

  const categories = await loadPortalCatalogCategories({
    mode: catalogEligibility.portalCategoryMode,
    approvedWorkTaskIds: approvedIds,
  });

  const base = {
    engagementType: client.engagementType,
    activeServiceModels,
    engagementLabel: getEngagementLabel(client.engagementType),
    isSupportBlock: catalogEligibility.hasSupportBlock,
    isRequestBased: catalogEligibility.hasRequestBased,
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
    allSubmitBlockers: submitBlockers.all.map((blocker) => ({
      reasonCode: blocker.reasonCode,
      message: blocker.portalMessage,
    })),
  };

  return {
    ...base,
    categories,
    supportAreas: catalogEligibility.hasSupportBlock ? deriveSupportAreas(categories) : [],
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
