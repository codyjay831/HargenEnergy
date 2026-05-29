import { beforeEach, describe, expect, it, vi } from "vitest";
import { BlockWorkActivityType } from "@/generated/prisma/client";

const { findManyMock } = vi.hoisted(() => ({
  findManyMock: vi.fn(),
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    blockWorkActivity: {
      findMany: findManyMock,
    },
  },
}));

import { loadClientBlockWorkTimeline } from "@/lib/block-work";

describe("loadClientBlockWorkTimeline", () => {
  beforeEach(() => {
    findManyMock.mockReset();
  });

  it("returns denormalized timeline rows sorted by query order", async () => {
    const createdAt = new Date("2026-05-01T12:00:00Z");
    findManyMock.mockResolvedValue([
      {
        id: "act-1",
        activityType: BlockWorkActivityType.ADMIN_UPDATE,
        title: "Proof of work",
        body: "Processed leads",
        visibleToClient: true,
        createdAt,
        authorType: "STAFF",
        blockWorkItemId: "item-1",
        authorUser: { name: "Alex", email: "alex@example.com" },
        blockWorkItem: {
          workTask: { name: "Lead intake", category: { name: "Sales" } },
        },
      },
    ]);

    const timeline = await loadClientBlockWorkTimeline("client-1");

    expect(timeline).toHaveLength(1);
    expect(timeline[0]).toMatchObject({
      id: "act-1",
      taskName: "Lead intake",
      taskCategoryName: "Sales",
      blockWorkItemId: "item-1",
      authorName: "Alex",
    });
  });

  it("applies clientVisibleOnly filter when requested", async () => {
    findManyMock.mockResolvedValue([]);

    await loadClientBlockWorkTimeline("client-1", { clientVisibleOnly: true });

    expect(findManyMock).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          visibleToClient: true,
          blockWorkItem: expect.objectContaining({ clientId: "client-1" }),
        }),
      }),
    );
  });

  it("omits visibleToClient filter for admin timeline", async () => {
    findManyMock.mockResolvedValue([]);

    await loadClientBlockWorkTimeline("client-1");

    const call = findManyMock.mock.calls[0][0];
    expect(call.where.visibleToClient).toBeUndefined();
  });
});
