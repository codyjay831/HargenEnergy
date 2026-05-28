import {
  EngagementType,
  type Client,
  type ClientServiceModel,
} from "@/generated/prisma/client";
import {
  getActiveServiceModelTypes,
  hasServiceModel,
  type ServiceModelTypeValue,
} from "@/lib/client-service-model";

export type ClientCatalogApprovals = Pick<Client, "engagementType"> & {
  approvedWorkTasks?: { workTaskId: string }[];
  serviceModels?: Array<Pick<ClientServiceModel, "modelType" | "isActive">>;
};

function getApprovedWorkTaskIds(client: ClientCatalogApprovals): string[] {
  return client.approvedWorkTasks?.map((entry) => entry.workTaskId) ?? [];
}

export type PortalCategoryQueryMode = "all_active" | "approved_active";

export type CatalogEligibilityInput = {
  engagementType: EngagementType;
  activeServiceModels?: ServiceModelTypeValue[];
  activeCatalogTaskCount: number;
  activeApprovedWorkTaskCount: number;
};

export type ClientCatalogEligibility = {
  activeServiceModels: ServiceModelTypeValue[];
  hasSupportBlock: boolean;
  hasRequestBased: boolean;
  supportBlockEligibleCount: number;
  requestBasedEligibleCount: number;
  catalogPathReady: boolean;
  supportBlockPathReady: boolean;
  requestBasedPathReady: boolean;
  portalCategoryMode: PortalCategoryQueryMode;
  portalVisibleTaskCount: number;
};

export type CatalogTaskCounts = {
  activeCatalogTaskCount: number;
  activeApprovedWorkTaskCount: number;
  discoveryActiveTaskCount: number;
};

export type PortalCatalogCategory = {
  id: string;
  name: string;
  tasks: Array<{
    id: string;
    name: string;
    description: string | null;
    requiredFields: unknown;
    requiredDocs: unknown;
  }>;
};

export function resolveActiveServiceModels(input: {
  engagementType: EngagementType;
  activeServiceModels?: ServiceModelTypeValue[];
}): ServiceModelTypeValue[] {
  return getActiveServiceModelTypes({
    engagementType: input.engagementType,
    serviceModels: input.activeServiceModels?.map((modelType) => ({
      modelType,
      isActive: true,
    })),
  });
}

export function getPortalCategoryQueryMode(
  activeModels: ServiceModelTypeValue[],
): PortalCategoryQueryMode {
  if (hasServiceModel(activeModels, "REQUEST_BASED")) {
    return "all_active";
  }
  return "approved_active";
}

export function getClientCatalogEligibility(
  input: CatalogEligibilityInput,
): ClientCatalogEligibility {
  const activeServiceModels = resolveActiveServiceModels(input);
  const hasSupportBlock = hasServiceModel(activeServiceModels, "SUPPORT_BLOCK");
  const hasRequestBased = hasServiceModel(activeServiceModels, "REQUEST_BASED");
  const supportBlockEligibleCount = input.activeApprovedWorkTaskCount;
  const requestBasedEligibleCount = input.activeCatalogTaskCount;
  const supportBlockPathReady = hasSupportBlock && supportBlockEligibleCount > 0;
  const requestBasedPathReady = hasRequestBased && requestBasedEligibleCount > 0;
  const catalogPathReady = supportBlockPathReady || requestBasedPathReady;
  const portalCategoryMode = getPortalCategoryQueryMode(activeServiceModels);
  const portalVisibleTaskCount =
    portalCategoryMode === "all_active"
      ? requestBasedEligibleCount
      : supportBlockEligibleCount;

  return {
    activeServiceModels,
    hasSupportBlock,
    hasRequestBased,
    supportBlockEligibleCount,
    requestBasedEligibleCount,
    catalogPathReady,
    supportBlockPathReady,
    requestBasedPathReady,
    portalCategoryMode,
    portalVisibleTaskCount,
  };
}

export type CatalogHealthSummary = {
  globalActiveCount: number;
  discoveryActiveCount: number;
  globalCatalogReady: boolean;
  discoveryCatalogReady: boolean;
};

export function assertWorkTaskEligibleForClient(params: {
  client: ClientCatalogApprovals;
  workTaskId: string;
  allowAdminOverride?: boolean;
}): { ok: true } | { ok: false; error: string } {
  const { client, workTaskId, allowAdminOverride } = params;

  if (allowAdminOverride) {
    return { ok: true };
  }

  const activeModels = getActiveServiceModelTypes({
    serviceModels: client.serviceModels,
    engagementType: client.engagementType,
  });
  const approvedIds = getApprovedWorkTaskIds(client);
  const requestBasedAllowed = hasServiceModel(activeModels, "REQUEST_BASED");
  const supportBlockAllowed =
    hasServiceModel(activeModels, "SUPPORT_BLOCK") && approvedIds.includes(workTaskId);

  if (requestBasedAllowed || supportBlockAllowed) {
    return { ok: true };
  }

  if (hasServiceModel(activeModels, "SUPPORT_BLOCK")) {
    if (approvedIds.length === 0) {
      return {
        ok: false,
        error:
          "Your support areas are still being configured. Contact Hargen before sending work.",
      };
    }

    return {
      ok: false,
      error: "That work type is not in your approved support areas.",
    };
  }

  return {
    ok: false,
    error: "Selected work type is not available for your account.",
  };
}
