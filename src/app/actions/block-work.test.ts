import { beforeEach, describe, expect, it, vi } from "vitest";
import { BlockWorkItemState, ClientStatus, EngagementType } from "@/generated/prisma/client";

vi.mock("server-only", () => ({}));

const mockRequireClientUser = vi.fn();
const mockRequireStaff = vi.fn();
const mockCheckRateLimit = vi.fn();
const mockWriteAuditLog = vi.fn();
const mockRevalidatePath = vi.fn();

const mockFindUnique = vi.fn();
const mockUpdate = vi.fn();
const mockActivityCreate = vi.fn();
const mockRequestCreate = vi.fn();

vi.mock("@/lib/auth-guards", () => ({
  requireClientUser: (...args: unknown[]) => mockRequireClientUser(...args),
  requireStaff: (...args: unknown[]) => mockRequireStaff(...args),
}));

vi.mock("@/lib/rate-limit", () => ({
  checkRateLimit: (...args: unknown[]) => mockCheckRateLimit(...args),
}));

vi.mock("@/lib/audit-log", () => ({
  writeAuditLog: (...args: unknown[]) => mockWriteAuditLog(...args),
}));

vi.mock("next/cache", () => ({
  revalidatePath: (...args: unknown[]) => mockRevalidatePath(...args),
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    $transaction: async (cb: (tx: unknown) => Promise<unknown>) =>
      cb({
        blockWorkItem: {
          findUnique: (...args: unknown[]) => mockFindUnique(...args),
          update: (...args: unknown[]) => mockUpdate(...args),
        },
        blockWorkActivity: {
          create: (...args: unknown[]) => mockActivityCreate(...args),
        },
        supportRequest: {
          create: (...args: unknown[]) => mockRequestCreate(...args),
        },
      }),
    blockWorkItem: {
      update: (...args: unknown[]) => mockUpdate(...args),
      findUnique: (...args: unknown[]) => mockFindUnique(...args),
    },
    blockWorkActivity: {
      create: (...args: unknown[]) => mockActivityCreate(...args),
    },
  },
}));

import {
  convertBlockWorkItemToRequest,
  nudgeBlockWorkItem,
} from "@/app/actions/block-work";

describe("block-work actions", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockRequireClientUser.mockResolvedValue({
      user: { id: "client-user-1", role: "CLIENT", clientId: "client-1" },
    });
    mockRequireStaff.mockResolvedValue({
      user: { id: "admin-1", role: "ADMIN" },
    });
    mockCheckRateLimit.mockResolvedValue({ allowed: true, retryAfterSec: 0 });
    mockUpdate.mockResolvedValue({ id: "item-1", clientId: "client-1" });
    mockActivityCreate.mockResolvedValue({ id: "activity-1" });
    mockWriteAuditLog.mockResolvedValue(undefined);
  });

  it("blocks nudges when rate limit is exceeded", async () => {
    mockCheckRateLimit.mockResolvedValue({ allowed: false, retryAfterSec: 120 });

    const result = await nudgeBlockWorkItem({
      blockWorkItemId: "item-1",
      note: "Need attention today",
    });

    expect(result).toEqual({
      error: "Too many nudges right now. Please try again later.",
    });
    expect(mockFindUnique).not.toHaveBeenCalled();
  });

  it("enforces client ownership when nudging", async () => {
    mockFindUnique.mockResolvedValue({
      id: "item-1",
      clientId: "client-2",
      workTaskId: "task-1",
      state: BlockWorkItemState.ACTIVE,
      currentPriorityRank: 3,
      workTask: { id: "task-1", name: "Permit Packet" },
      client: {
        id: "client-2",
        status: ClientStatus.ACTIVE,
        engagementType: EngagementType.SUPPORT_BLOCK,
        approvedWorkTasks: [{ workTaskId: "task-1" }],
        serviceModels: [{ modelType: "SUPPORT_BLOCK", isActive: true }],
      },
    });

    const result = await nudgeBlockWorkItem({
      blockWorkItemId: "item-1",
      note: "New lead batch",
    });

    expect(result).toEqual({ error: "Forbidden." });
    expect(mockActivityCreate).not.toHaveBeenCalled();
  });

  it("converts block work item into priced request with linkage activity", async () => {
    mockFindUnique.mockResolvedValue({
      id: "item-1",
      clientId: "client-1",
      workTaskId: "task-1",
      client: { id: "client-1", companyName: "Acme Solar" },
      workTask: { id: "task-1", name: "Permitting" },
    });
    mockRequestCreate.mockResolvedValue({ id: "req-9" });

    const result = await convertBlockWorkItemToRequest({
      blockWorkItemId: "item-1",
      title: "Permitting batch escalation",
      description: "Escalate due to high volume.",
      urgency: "NORMAL",
    });

    expect(result).toEqual({ success: true, requestId: "req-9" });
    expect(mockRequestCreate).toHaveBeenCalled();
    expect(mockActivityCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          blockWorkItemId: "item-1",
          supportRequestId: "req-9",
        }),
      }),
    );
  });
});
