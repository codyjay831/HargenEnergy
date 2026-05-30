import {
  EngagementType,
  type Client,
  type ClientServiceModel,
} from "@/generated/prisma/client";

export const SERVICE_MODEL_TYPES = [
  "SUPPORT_BLOCK",
  "REQUEST_BASED",
] as const;

export type ServiceModelTypeValue = (typeof SERVICE_MODEL_TYPES)[number];

export const DEFAULT_SERVICE_MODELS: ServiceModelTypeValue[] = [
  "SUPPORT_BLOCK",
  "REQUEST_BASED",
];

export function toServiceModelType(
  engagementType: EngagementType,
): ServiceModelTypeValue {
  return engagementType as unknown as ServiceModelTypeValue;
}

export function toEngagementType(
  modelType: ServiceModelTypeValue,
): EngagementType {
  return modelType as unknown as EngagementType;
}

export function pickPrimaryEngagementType(
  modelTypes: ServiceModelTypeValue[],
): EngagementType {
  if (modelTypes.includes("SUPPORT_BLOCK")) {
    return EngagementType.SUPPORT_BLOCK;
  }
  return EngagementType.REQUEST_BASED;
}

export function getActiveServiceModelTypes(input: {
  serviceModels?: Array<Pick<ClientServiceModel, "modelType" | "isActive">>;
  engagementType: EngagementType;
}): ServiceModelTypeValue[] {
  const explicit = (input.serviceModels ?? [])
    .filter((item) => item.isActive)
    .map((item) => item.modelType as ServiceModelTypeValue);

  if (explicit.length > 0) {
    return Array.from(new Set(explicit));
  }

  return [toServiceModelType(input.engagementType)];
}

export function hasServiceModel(
  models: ServiceModelTypeValue[],
  modelType: ServiceModelTypeValue,
): boolean {
  return models.includes(modelType);
}

export function normalizeRequestedServiceModels(
  requested: ServiceModelTypeValue[],
): ServiceModelTypeValue[] {
  const deduped = Array.from(new Set(requested));
  if (deduped.length === 0) {
    return ["SUPPORT_BLOCK"];
  }
  return deduped;
}

export type ClientWithServiceModelState = Pick<Client, "engagementType"> & {
  serviceModels?: Array<Pick<ClientServiceModel, "modelType" | "isActive">>;
};

export type ClientWithServiceLaneState = ClientWithServiceModelState & {
  approvedWorkTasks?: Array<{ workTaskId: string }>;
};

export function getClientServicePaths(client: ClientWithServiceModelState): {
  activeModels: ServiceModelTypeValue[];
  hasSupportBlock: boolean;
  hasFixedFee: boolean;
} {
  const activeModels = getActiveServiceModelTypes({
    engagementType: client.engagementType,
    serviceModels: client.serviceModels,
  });

  return {
    activeModels,
    hasSupportBlock: hasServiceModel(activeModels, "SUPPORT_BLOCK"),
    hasFixedFee: hasServiceModel(activeModels, "REQUEST_BASED"),
  };
}

export function resolveWorkLaneForTask(input: {
  client: ClientWithServiceLaneState;
  workTaskId?: string | null;
}): "SUPPORT_BLOCK" | "REQUEST_BASED" | null {
  const servicePaths = getClientServicePaths(input.client);
  const approvedWorkTaskIds = input.client.approvedWorkTasks?.map((row) => row.workTaskId) ?? [];

  if (
    input.workTaskId &&
    servicePaths.hasSupportBlock &&
    approvedWorkTaskIds.includes(input.workTaskId)
  ) {
    return "SUPPORT_BLOCK";
  }
  if (servicePaths.hasFixedFee) {
    return "REQUEST_BASED";
  }
  if (servicePaths.hasSupportBlock) {
    return "SUPPORT_BLOCK";
  }
  return null;
}
