import { prisma } from "@/lib/prisma";
import {
  getPortalWorkSubmitEligibility,
  type PortalSubmitBlockReason,
  type PortalSubmitEligibility,
} from "@/lib/portal-submit-eligibility";
import { getSubmitBlockerCopy } from "@/lib/submit-blockers";
import { loadCatalogTaskCounts } from "@/lib/client-catalog-loader";
import {
  assertWorkTaskEligibleForClient,
  type ClientCatalogApprovals,
} from "@/lib/client-catalog-eligibility";
import { isPaymentMadeForSubmit } from "@/lib/client-billing-readiness";
import { getClientServicePaths } from "@/lib/client-service-model";
import { EngagementType } from "@/generated/prisma/client";
import { resolveActiveWorkTask } from "@/lib/engagement";
import {
  logWorkGateEvent,
  type WorkGateEntryPoint,
} from "@/lib/work-gate-events";

/** Admin-facing copy aligned with portal submit block reason codes. */
export const ADMIN_WORK_BLOCK_MESSAGES: Record<PortalSubmitBlockReason, string> = {
  not_active: getSubmitBlockerCopy("not_active", "admin"),
  agreement_pending: getSubmitBlockerCopy("agreement_pending", "admin"),
  scope_not_configured: getSubmitBlockerCopy("scope_not_configured", "admin"),
  payment_not_made: getSubmitBlockerCopy("payment_not_made", "admin"),
  no_catalog_tasks: getSubmitBlockerCopy("no_catalog_tasks", "admin"),
};

export type AdminWorkBlockResult =
  | { ok: true }
  | {
      ok: false;
      reasonCode: PortalSubmitBlockReason;
      message: string;
    };

export type WorkGateCheckOptions = {
  entryPoint: WorkGateEntryPoint;
  actorId?: string;
  requestId?: string;
  workTaskId?: string;
};

export function toAdminWorkBlock(
  eligibility: PortalSubmitEligibility,
): AdminWorkBlockResult {
  if (eligibility.canSubmit) {
    return { ok: true };
  }

  return {
    ok: false,
    reasonCode: eligibility.reasonCode,
    message: ADMIN_WORK_BLOCK_MESSAGES[eligibility.reasonCode],
  };
}

const clientSubmitEligibilitySelect = {
  status: true,
  agreementStatus: true,
  engagementType: true,
  serviceModels: { select: { modelType: true, isActive: true } },
  billingMode: true,
  billingOverrideReason: true,
  billingOverrideExpiresAt: true,
  billingOverrideCreatedAt: true,
  billingOverrideCreatedById: true,
  stripeCustomerId: true,
  stripeSubscriptionId: true,
  subscriptionStatus: true,
  subscriptionCurrentPeriodEnd: true,
  approvedWorkTasks: { select: { workTaskId: true } },
} as const;

const clientCatalogApprovalsSelect = {
  engagementType: true,
  approvedWorkTasks: { select: { workTaskId: true } },
  serviceModels: { select: { modelType: true, isActive: true } },
} as const;

export type ClientCatalogContext = ClientCatalogApprovals;

function recordWorkGateForClient(
  clientId: string,
  outcome: "allowed" | "blocked",
  options: WorkGateCheckOptions,
  reasonCode?: PortalSubmitBlockReason | "client_not_found" | "task_not_in_scope" | "task_inactive",
): void {
  logWorkGateEvent({
    outcome,
    entryPoint: options.entryPoint,
    clientId,
    reasonCode,
    requestId: options.requestId,
    workTaskId: options.workTaskId,
    actorId: options.actorId,
  });
}

export async function resolveClientSubmitEligibility(
  clientId: string,
): Promise<PortalSubmitEligibility | null> {
  const client = await prisma.client.findUnique({
    where: { id: clientId },
    select: clientSubmitEligibilitySelect,
  });

  if (!client) {
    return null;
  }

  const approvedIds = client.approvedWorkTasks.map((a) => a.workTaskId);
  const { activeCatalogTaskCount, activeApprovedWorkTaskCount } =
    await loadCatalogTaskCounts(approvedIds);

  return getPortalWorkSubmitEligibility({
    status: client.status,
    agreementStatus: client.agreementStatus,
    engagementType: client.engagementType,
    activeServiceModels: (client.serviceModels ?? [])
      .filter((item) => item.isActive)
      .map((item) => item.modelType),
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
    activeCatalogTaskCount: activeCatalogTaskCount,
  });
}

export async function loadClientCatalogContext(
  clientId: string,
): Promise<ClientCatalogContext | null> {
  return prisma.client.findUnique({
    where: { id: clientId },
    select: clientCatalogApprovalsSelect,
  });
}

export async function checkClientCanStartWork(
  clientId: string,
  options?: WorkGateCheckOptions,
): Promise<AdminWorkBlockResult | { ok: false; reasonCode: "client_not_found"; message: string }> {
  const eligibility = await resolveClientSubmitEligibility(clientId);
  if (!eligibility) {
    if (options) {
      recordWorkGateForClient(clientId, "blocked", options, "client_not_found");
    }
    return {
      ok: false,
      reasonCode: "client_not_found",
      message: "Client not found.",
    };
  }

  const result = toAdminWorkBlock(eligibility);
  if (options) {
    recordWorkGateForClient(
      clientId,
      result.ok ? "allowed" : "blocked",
      options,
      result.ok ? undefined : result.reasonCode,
    );
  }

  return result;
}

export async function assertClientCanStartWork(
  clientId: string,
  options?: WorkGateCheckOptions,
): Promise<void> {
  const result = await checkClientCanStartWork(clientId, options);
  if (!result.ok) {
    throw new Error(result.message);
  }
}

export async function checkPortalWorkSubmit(
  clientId: string,
  options: WorkGateCheckOptions,
): Promise<
  | { ok: true }
  | { ok: false; error: string; reasonCode: PortalSubmitBlockReason | "client_not_found" }
> {
  const eligibility = await resolveClientSubmitEligibility(clientId);
  if (!eligibility) {
    recordWorkGateForClient(clientId, "blocked", options, "client_not_found");
    return {
      ok: false,
      error: "Client record not found.",
      reasonCode: "client_not_found",
    };
  }

  if (!eligibility.canSubmit) {
    recordWorkGateForClient(clientId, "blocked", options, eligibility.reasonCode);
    return {
      ok: false,
      error: eligibility.message,
      reasonCode: eligibility.reasonCode,
    };
  }

  recordWorkGateForClient(clientId, "allowed", options);
  return { ok: true };
}

export async function checkClientWorkTaskSubmit(params: {
  clientId: string;
  client: ClientCatalogContext;
  workTaskId: string;
  allowAdminOverride?: boolean;
  options: WorkGateCheckOptions;
}): Promise<
  | { ok: true; workTask: { id: string; name: string } }
  | {
      ok: false;
      error: string;
      reasonCode: "task_inactive" | "task_not_in_scope" | "payment_not_ready";
    }
> {
  const { clientId, client, workTaskId, allowAdminOverride, options } = params;
  const gateOptions = { ...options, workTaskId };

  const taskResult = await resolveActiveWorkTask(workTaskId, (id) =>
    prisma.workTask.findUnique({ where: { id } }),
  );
  if (!taskResult.ok) {
    recordWorkGateForClient(clientId, "blocked", gateOptions, "task_inactive");
    return { ok: false, error: taskResult.error, reasonCode: "task_inactive" };
  }

  const allowed = assertWorkTaskEligibleForClient({
    client,
    workTaskId,
    allowAdminOverride,
  });
  if (!allowed.ok) {
    recordWorkGateForClient(clientId, "blocked", gateOptions, "task_not_in_scope");
    return { ok: false, error: allowed.error, reasonCode: "task_not_in_scope" };
  }

  if (!allowAdminOverride) {
    const servicePaths = getClientServicePaths(client);
    const approvedWorkTaskIds =
      client.approvedWorkTasks?.map((entry) => entry.workTaskId) ?? [];
    const isSupportBlockTask =
      servicePaths.hasSupportBlock && approvedWorkTaskIds.includes(workTaskId);

    if (isSupportBlockTask) {
      const billingClient = await prisma.client.findUnique({
        where: { id: clientId },
        select: {
          billingMode: true,
          billingOverrideReason: true,
          billingOverrideExpiresAt: true,
          billingOverrideCreatedAt: true,
          billingOverrideCreatedById: true,
          stripeCustomerId: true,
          stripeSubscriptionId: true,
          subscriptionStatus: true,
          subscriptionCurrentPeriodEnd: true,
        },
      });

      if (!billingClient) {
        recordWorkGateForClient(clientId, "blocked", gateOptions, "client_not_found");
        return {
          ok: false,
          error: "Client record not found.",
          reasonCode: "payment_not_ready",
        };
      }

      const supportBlockBillingReady = isPaymentMadeForSubmit({
        engagementType: EngagementType.SUPPORT_BLOCK,
        billingMode: billingClient.billingMode,
        billingOverrideReason: billingClient.billingOverrideReason,
        billingOverrideExpiresAt: billingClient.billingOverrideExpiresAt,
        billingOverrideCreatedAt: billingClient.billingOverrideCreatedAt,
        billingOverrideCreatedById: billingClient.billingOverrideCreatedById,
        stripeCustomerId: billingClient.stripeCustomerId,
        stripeSubscriptionId: billingClient.stripeSubscriptionId,
        subscriptionStatus: billingClient.subscriptionStatus,
        subscriptionCurrentPeriodEnd: billingClient.subscriptionCurrentPeriodEnd,
      });

      if (!supportBlockBillingReady) {
        recordWorkGateForClient(clientId, "blocked", gateOptions, "payment_not_made");
        return {
          ok: false,
          error:
            "Support Block payment is not ready for this account. Complete billing before starting this work.",
          reasonCode: "payment_not_ready",
        };
      }
    }
  }

  return {
    ok: true,
    workTask: { id: taskResult.workTask.id, name: taskResult.workTask.name },
  };
}
