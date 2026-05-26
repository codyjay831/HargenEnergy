import { describe, it, expect, vi, beforeEach } from "vitest";

const mockFindMany = vi.fn();
const mockCount = vi.fn();

vi.mock("@/lib/prisma", () => ({
  prisma: {
    serviceCategory: {
      findMany: mockFindMany,
    },
    workTask: {
      count: mockCount,
      findMany: mockFindMany,
    },
  },
}));

describe("walkthrough catalog", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("validateRequestedWalkthroughTaskIds rejects empty selection", async () => {
    const { validateRequestedWalkthroughTaskIds } = await import("@/lib/walkthrough-catalog");
    const result = await validateRequestedWalkthroughTaskIds([]);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error).toMatch(/at least one/i);
    }
  });

  it("validateRequestedWalkthroughTaskIds rejects invalid ids", async () => {
    mockFindMany.mockResolvedValueOnce([]);
    const { validateRequestedWalkthroughTaskIds } = await import("@/lib/walkthrough-catalog");
    const result = await validateRequestedWalkthroughTaskIds(["task-a", "task-b"]);
    expect(result.ok).toBe(false);
  });

  it("validateRequestedWalkthroughTaskIds returns ordered tasks", async () => {
    mockFindMany.mockResolvedValueOnce([
      { id: "task-b", name: "Utility Follow-Up" },
      { id: "task-a", name: "Permit Follow-Up" },
    ]);
    const { validateRequestedWalkthroughTaskIds } = await import("@/lib/walkthrough-catalog");
    const result = await validateRequestedWalkthroughTaskIds(["task-a", "task-b"]);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.tasks.map((task) => task.id)).toEqual(["task-a", "task-b"]);
    }
  });

  it("getPublicWalkthroughCatalog filters empty categories", async () => {
    mockFindMany.mockResolvedValueOnce([
      {
        id: "cat-1",
        name: "Permits",
        tasks: [{ id: "task-1", name: "Permit Follow-Up", description: "Follow up" }],
      },
      {
        id: "cat-2",
        name: "Empty",
        tasks: [],
      },
    ]);
    const { getPublicWalkthroughCatalog } = await import("@/lib/walkthrough-catalog");
    const catalog = await getPublicWalkthroughCatalog();
    expect(catalog).toHaveLength(1);
    expect(catalog[0]?.tasks[0]?.name).toBe("Permit Follow-Up");
  });
});
