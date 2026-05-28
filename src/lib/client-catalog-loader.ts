import { prisma } from "@/lib/prisma";
import { countPublicDiscoveryTasks } from "@/lib/discovery-catalog";
import type {
  CatalogHealthSummary,
  CatalogTaskCounts,
  PortalCatalogCategory,
  PortalCategoryQueryMode,
} from "@/lib/client-catalog-eligibility";

const TASK_SELECT = {
  id: true,
  name: true,
  description: true,
  requiredFields: true,
  requiredDocs: true,
} as const;

export async function loadCatalogTaskCounts(
  approvedWorkTaskIds: string[],
): Promise<CatalogTaskCounts> {
  const [activeCatalogTaskCount, activeApprovedWorkTaskCount, discoveryActiveTaskCount] =
    await Promise.all([
      prisma.workTask.count({ where: { isActive: true } }),
      approvedWorkTaskIds.length === 0
        ? Promise.resolve(0)
        : prisma.workTask.count({
            where: { isActive: true, id: { in: approvedWorkTaskIds } },
          }),
      countPublicDiscoveryTasks(),
    ]);

  return {
    activeCatalogTaskCount,
    activeApprovedWorkTaskCount,
    discoveryActiveTaskCount,
  };
}

export async function loadPortalCatalogCategories(params: {
  mode: PortalCategoryQueryMode;
  approvedWorkTaskIds: string[];
}): Promise<PortalCatalogCategory[]> {
  const { mode, approvedWorkTaskIds } = params;

  if (mode === "approved_active" && approvedWorkTaskIds.length === 0) {
    return [];
  }

  const rawCategories = await prisma.serviceCategory.findMany({
    where: { isActive: true },
    include: {
      tasks: {
        where:
          mode === "all_active"
            ? { isActive: true }
            : { id: { in: approvedWorkTaskIds }, isActive: true },
        orderBy: { basePriority: "asc" },
        select: TASK_SELECT,
      },
    },
    orderBy: { name: "asc" },
  });

  return rawCategories
    .map((category) => ({
      id: category.id,
      name: category.name,
      tasks: category.tasks,
    }))
    .filter((category) => category.tasks.length > 0);
}

export async function getCatalogHealthSummary(): Promise<CatalogHealthSummary> {
  const counts = await loadCatalogTaskCounts([]);
  return {
    globalActiveCount: counts.activeCatalogTaskCount,
    discoveryActiveCount: counts.discoveryActiveTaskCount,
    globalCatalogReady: counts.activeCatalogTaskCount > 0,
    discoveryCatalogReady: counts.discoveryActiveTaskCount > 0,
  };
}

export type { CatalogHealthSummary } from "@/lib/client-catalog-eligibility";
