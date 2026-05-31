import { beforeEach, describe, expect, it, vi } from "vitest";
import { RequestStatus, SupportRequestKind } from "@/generated/prisma/client";
import {
  getAdminNotificationTypeLabel,
  isNeedsInfoActive,
  needsInfoWhereClause,
} from "@/lib/admin-request-attention";

vi.mock("server-only", () => ({}));

const mockCreate = vi.fn();
const mockUpdateMany = vi.fn();
const mockCount = vi.fn();
const mockFindMany = vi.fn();

vi.mock("@/lib/prisma", () => ({
  prisma: {
    adminNotification: {
      create: (...args: unknown[]) => mockCreate(...args),
      updateMany: (...args: unknown[]) => mockUpdateMany(...args),
      count: (...args: unknown[]) => mockCount(...args),
      findMany: (...args: unknown[]) => mockFindMany(...args),
    },
  },
}));

import {
  createAdminNotification,
  getAttentionItems,
  getUnreadNotificationCount,
  getUnreadNotificationRequestIds,
  markNotificationsReadForRequest,
} from "@/lib/admin-notifications";

describe("admin request attention helpers", () => {
  it("includes needsInfo flag and NEEDS_INFO status", () => {
    expect(needsInfoWhereClause()).toEqual({
      OR: [{ needsInfo: true }, { status: RequestStatus.NEEDS_INFO }],
    });
  });

  it("matches needs-info state by flag or status", () => {
    expect(
      isNeedsInfoActive({
        needsInfo: true,
        status: RequestStatus.IN_PROGRESS,
      }),
    ).toBe(true);

    expect(
      isNeedsInfoActive({
        needsInfo: false,
        status: RequestStatus.NEEDS_INFO,
      }),
    ).toBe(true);
  });

  it("labels info responses distinctly from comments", () => {
    expect(getAdminNotificationTypeLabel("CLIENT_INFO_RESPONSE")).toBe(
      "Client responded",
    );
    expect(getAdminNotificationTypeLabel("CLIENT_COMMENT")).toBe(
      "New client message",
    );
  });
});

describe("admin notifications service", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("creates notification with trimmed/truncated summary", async () => {
    const longSummary = `  ${"a".repeat(600)}  `;
    mockCreate.mockResolvedValue({});

    await createAdminNotification({
      type: "CLIENT_COMMENT",
      supportRequestId: "req-1",
      clientId: "client-1",
      title: "  Scope update ",
      summary: longSummary,
      attachmentCount: 2,
    });

    expect(mockCreate).toHaveBeenCalledTimes(1);
    const arg = mockCreate.mock.calls[0][0];
    expect(arg.data.title).toBe("Scope update");
    expect(arg.data.attachmentCount).toBe(2);
    expect(arg.data.summary.length).toBe(500);
    expect(arg.data.summary.endsWith("...")).toBe(true);
  });

  it("marks unread notifications as read for a request", async () => {
    mockUpdateMany.mockResolvedValue({ count: 3 });

    await markNotificationsReadForRequest("req-1");

    expect(mockUpdateMany).toHaveBeenCalledWith({
      where: { supportRequestId: "req-1", readAt: null },
      data: { readAt: expect.any(Date) },
    });
  });

  it("counts only unread notifications for open client-ops requests", async () => {
    mockCount.mockResolvedValue(4);

    const count = await getUnreadNotificationCount();

    expect(count).toBe(4);
    expect(mockCount).toHaveBeenCalledWith({
      where: {
        readAt: null,
        supportRequest: {
          kind: SupportRequestKind.CLIENT_OPS,
          status: { notIn: [RequestStatus.COMPLETE, RequestStatus.CANCELLED] },
        },
      },
    });
  });

  it("maps attention items and applies open-request filter", async () => {
    mockFindMany.mockResolvedValue([
      {
        id: "n-1",
        type: "CLIENT_INFO_RESPONSE",
        supportRequestId: "req-1",
        clientId: "client-1",
        title: "Discovery call request",
        summary: "Attached files",
        attachmentCount: 1,
        createdAt: new Date("2026-01-01T00:00:00.000Z"),
        client: { companyName: "Struxient" },
      },
    ]);

    const items = await getAttentionItems(5);

    expect(items).toHaveLength(1);
    expect(items[0].companyName).toBe("Struxient");
    expect(mockFindMany).toHaveBeenCalledWith({
      where: {
        readAt: null,
        supportRequest: {
          kind: SupportRequestKind.CLIENT_OPS,
          status: { notIn: [RequestStatus.COMPLETE, RequestStatus.CANCELLED] },
        },
      },
      orderBy: { createdAt: "desc" },
      take: 5,
      include: { client: { select: { companyName: true } } },
    });
  });

  it("returns distinct unread request IDs", async () => {
    mockFindMany.mockResolvedValue([
      { supportRequestId: "req-1" },
      { supportRequestId: "req-2" },
    ]);

    const ids = await getUnreadNotificationRequestIds();

    expect(ids).toEqual(new Set(["req-1", "req-2"]));
    expect(mockFindMany).toHaveBeenCalledWith({
      where: {
        readAt: null,
        supportRequest: {
          kind: SupportRequestKind.CLIENT_OPS,
          status: { notIn: [RequestStatus.COMPLETE, RequestStatus.CANCELLED] },
        },
      },
      select: { supportRequestId: true },
      distinct: ["supportRequestId"],
    });
  });
});
