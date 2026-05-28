import { describe, expect, it } from "vitest";
import { EngagementType } from "@/generated/prisma/client";
import {
  assertWorkTaskEligibleForClient,
  getClientCatalogEligibility,
  getPortalCategoryQueryMode,
} from "@/lib/client-catalog-eligibility";

describe("getClientCatalogEligibility", () => {
  it("marks support block path ready when approved active tasks exist", () => {
    const eligibility = getClientCatalogEligibility({
      engagementType: EngagementType.SUPPORT_BLOCK,
      activeCatalogTaskCount: 5,
      activeApprovedWorkTaskCount: 2,
    });

    expect(eligibility.hasSupportBlock).toBe(true);
    expect(eligibility.hasRequestBased).toBe(false);
    expect(eligibility.supportBlockPathReady).toBe(true);
    expect(eligibility.requestBasedPathReady).toBe(false);
    expect(eligibility.portalCategoryMode).toBe("approved_active");
    expect(eligibility.portalVisibleTaskCount).toBe(2);
  });

  it("marks request-based path ready when global catalog has tasks", () => {
    const eligibility = getClientCatalogEligibility({
      engagementType: EngagementType.REQUEST_BASED,
      activeCatalogTaskCount: 3,
      activeApprovedWorkTaskCount: 0,
    });

    expect(eligibility.requestBasedPathReady).toBe(true);
    expect(eligibility.portalCategoryMode).toBe("all_active");
    expect(eligibility.portalVisibleTaskCount).toBe(3);
  });

  it("allows hybrid catalog path via request-based when scope is empty", () => {
    const eligibility = getClientCatalogEligibility({
      engagementType: EngagementType.SUPPORT_BLOCK,
      activeServiceModels: ["SUPPORT_BLOCK", "REQUEST_BASED"],
      activeCatalogTaskCount: 4,
      activeApprovedWorkTaskCount: 0,
    });

    expect(eligibility.catalogPathReady).toBe(true);
    expect(eligibility.supportBlockPathReady).toBe(false);
    expect(eligibility.requestBasedPathReady).toBe(true);
    expect(getPortalCategoryQueryMode(eligibility.activeServiceModels)).toBe("all_active");
  });
});

describe("assertWorkTaskEligibleForClient", () => {
  const supportBlockClient = {
    engagementType: EngagementType.SUPPORT_BLOCK,
    approvedWorkTasks: [{ workTaskId: "task-a" }],
    serviceModels: [{ modelType: "SUPPORT_BLOCK" as const, isActive: true }],
  };

  it("allows approved tasks for support block clients", () => {
    const result = assertWorkTaskEligibleForClient({
      client: supportBlockClient,
      workTaskId: "task-a",
    });
    expect(result.ok).toBe(true);
  });

  it("rejects unapproved tasks for support block clients", () => {
    const result = assertWorkTaskEligibleForClient({
      client: supportBlockClient,
      workTaskId: "task-b",
    });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error).toContain("approved support areas");
    }
  });

  it("allows any active task for request-based clients", () => {
    const result = assertWorkTaskEligibleForClient({
      client: {
        engagementType: EngagementType.REQUEST_BASED,
        approvedWorkTasks: [],
        serviceModels: [{ modelType: "REQUEST_BASED" as const, isActive: true }],
      },
      workTaskId: "task-z",
    });
    expect(result.ok).toBe(true);
  });

  it("allows catalog tasks for hybrid clients even without approved scope", () => {
    const result = assertWorkTaskEligibleForClient({
      client: {
        engagementType: EngagementType.SUPPORT_BLOCK,
        approvedWorkTasks: [],
        serviceModels: [
          { modelType: "SUPPORT_BLOCK" as const, isActive: true },
          { modelType: "REQUEST_BASED" as const, isActive: true },
        ],
      },
      workTaskId: "task-z",
    });
    expect(result.ok).toBe(true);
  });
});
