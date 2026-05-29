import { describe, expect, it } from "vitest";
import { ClientStatus, EngagementType } from "@/generated/prisma/client";
import {
  BLOCK_WORK_DEFAULT_PRIORITY,
  BLOCK_WORK_PRIORITY_MAX,
  BLOCK_WORK_PRIORITY_MIN,
  canClientUseBlockWork,
  clampBlockWorkPriorityRank,
  isWorkTaskApprovedForClientBlock,
  lowerPriorityRankOnClientNudge,
} from "@/lib/block-work-policy";

describe("block-work-policy", () => {
  it("allows active clients with support block model", () => {
    const result = canClientUseBlockWork({
      status: ClientStatus.ACTIVE,
      engagementType: EngagementType.SUPPORT_BLOCK,
      serviceModels: [{ modelType: "SUPPORT_BLOCK", isActive: true }],
      approvedWorkTasks: [{ workTaskId: "task-1" }],
    });

    expect(result).toEqual({ ok: true });
  });

  it("rejects inactive clients", () => {
    const result = canClientUseBlockWork({
      status: ClientStatus.PAUSED,
      engagementType: EngagementType.SUPPORT_BLOCK,
      serviceModels: [{ modelType: "SUPPORT_BLOCK", isActive: true }],
    });

    expect(result).toEqual({
      ok: false,
      error: "Block work is only available for active clients.",
    });
  });

  it("rejects clients without support block service model", () => {
    const result = canClientUseBlockWork({
      status: ClientStatus.ACTIVE,
      engagementType: EngagementType.REQUEST_BASED,
      serviceModels: [{ modelType: "REQUEST_BASED", isActive: true }],
    });

    expect(result).toEqual({
      ok: false,
      error: "Support Block is not active on this account.",
    });
  });

  it("matches approved task IDs for block scope", () => {
    expect(
      isWorkTaskApprovedForClientBlock(
        {
          status: ClientStatus.ACTIVE,
          engagementType: EngagementType.SUPPORT_BLOCK,
          approvedWorkTasks: [{ workTaskId: "task-a" }],
        },
        "task-a",
      ),
    ).toBe(true);

    expect(
      isWorkTaskApprovedForClientBlock(
        {
          status: ClientStatus.ACTIVE,
          engagementType: EngagementType.SUPPORT_BLOCK,
          approvedWorkTasks: [{ workTaskId: "task-a" }],
        },
        "task-b",
      ),
    ).toBe(false);
  });

  it("clamps and lowers priority ranks safely", () => {
    expect(clampBlockWorkPriorityRank(0)).toBe(BLOCK_WORK_PRIORITY_MIN);
    expect(clampBlockWorkPriorityRank(9)).toBe(BLOCK_WORK_PRIORITY_MAX);
    expect(lowerPriorityRankOnClientNudge(4)).toBe(3);
    expect(lowerPriorityRankOnClientNudge(1)).toBe(1);
    expect(lowerPriorityRankOnClientNudge(null)).toBe(BLOCK_WORK_DEFAULT_PRIORITY - 1);
  });
});
