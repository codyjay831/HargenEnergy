import {
  ClientStatus,
  type Client,
  type ClientServiceModel,
  type EngagementType,
} from "@/generated/prisma/client";
import {
  getActiveServiceModelTypes,
  hasServiceModel,
  type ServiceModelTypeValue,
} from "@/lib/client-service-model";

export const BLOCK_WORK_PRIORITY_MIN = 1;
export const BLOCK_WORK_PRIORITY_MAX = 5;
export const BLOCK_WORK_DEFAULT_PRIORITY = 3;

export type BlockWorkClientContext = Pick<Client, "status" | "engagementType"> & {
  approvedWorkTasks?: Array<{ workTaskId: string }>;
  serviceModels?: Array<Pick<ClientServiceModel, "modelType" | "isActive">>;
};

export function isBlockWorkboardEnabled(): boolean {
  if (process.env.NODE_ENV !== "production") {
    return true;
  }
  return process.env.BLOCK_WORKBOARD_ENABLED === "1";
}

export function clampBlockWorkPriorityRank(value: number): number {
  return Math.max(BLOCK_WORK_PRIORITY_MIN, Math.min(BLOCK_WORK_PRIORITY_MAX, value));
}

export function getBlockWorkPriorityLabel(rank: number): string {
  const safeRank = clampBlockWorkPriorityRank(rank);
  return `P${safeRank}`;
}

export function lowerPriorityRankOnClientNudge(currentRank: number | null | undefined): number {
  const safeCurrent = clampBlockWorkPriorityRank(
    typeof currentRank === "number" ? currentRank : BLOCK_WORK_DEFAULT_PRIORITY,
  );
  return clampBlockWorkPriorityRank(safeCurrent - 1);
}

export function resolveClientActiveServiceModels(input: {
  engagementType: EngagementType;
  serviceModels?: Array<Pick<ClientServiceModel, "modelType" | "isActive">>;
}): ServiceModelTypeValue[] {
  return getActiveServiceModelTypes({
    engagementType: input.engagementType,
    serviceModels: input.serviceModels,
  });
}

export function canClientUseBlockWork(
  client: BlockWorkClientContext,
): { ok: true } | { ok: false; error: string } {
  if (client.status !== ClientStatus.ACTIVE) {
    return { ok: false, error: "Block work is only available for active clients." };
  }

  const activeModels = resolveClientActiveServiceModels({
    engagementType: client.engagementType,
    serviceModels: client.serviceModels,
  });

  if (!hasServiceModel(activeModels, "SUPPORT_BLOCK")) {
    return {
      ok: false,
      error: "Support Block is not active on this account.",
    };
  }

  return { ok: true };
}

export function isWorkTaskApprovedForClientBlock(
  client: BlockWorkClientContext,
  workTaskId: string,
): boolean {
  const approvedTaskIds = new Set(client.approvedWorkTasks?.map((task) => task.workTaskId) ?? []);
  return approvedTaskIds.has(workTaskId);
}
