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

describe("discovery catalog", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("validateRequestedDiscoveryTaskIds rejects empty selection", async () => {
    const { validateRequestedDiscoveryTaskIds } = await import("@/lib/discovery-catalog");
    const result = await validateRequestedDiscoveryTaskIds([]);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error).toMatch(/at least one/i);
    }
  });

  it("validateRequestedDiscoveryTaskIds rejects invalid ids", async () => {
    mockFindMany.mockResolvedValueOnce([]);
    const { validateRequestedDiscoveryTaskIds } = await import("@/lib/discovery-catalog");
    const result = await validateRequestedDiscoveryTaskIds(["task-a", "task-b"]);
    expect(result.ok).toBe(false);
  });

  it("validateRequestedDiscoveryTaskIds returns ordered tasks", async () => {
    mockFindMany.mockResolvedValueOnce([
      { id: "task-b", name: "Utility Follow-Up" },
      { id: "task-a", name: "Permit Follow-Up" },
    ]);
    const { validateRequestedDiscoveryTaskIds } = await import("@/lib/discovery-catalog");
    const result = await validateRequestedDiscoveryTaskIds(["task-a", "task-b"]);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.tasks.map((task) => task.id)).toEqual(["task-a", "task-b"]);
    }
  });

  it("getPublicDiscoveryCatalog filters empty categories", async () => {
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
    const { getPublicDiscoveryCatalog } = await import("@/lib/discovery-catalog");
    const catalog = await getPublicDiscoveryCatalog();
    expect(catalog).toHaveLength(1);
    expect(catalog[0]?.tasks[0]?.name).toBe("Permit Follow-Up");
  });
});
