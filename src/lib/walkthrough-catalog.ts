import { prisma } from "@/lib/prisma";

export type WalkthroughCatalogTask = {
  id: string;
  name: string;
  description: string | null;
};

export type WalkthroughCatalogCategory = {
  id: string;
  name: string;
  tasks: WalkthroughCatalogTask[];
};

export async function getPublicWalkthroughCatalog(): Promise<WalkthroughCatalogCategory[]> {
  const categories = await prisma.serviceCategory.findMany({
    where: {
      isActive: true,
      tasks: {
        some: {
          isActive: true,
          showOnWalkthrough: true,
        },
      },
    },
    select: {
      id: true,
      name: true,
      tasks: {
        where: {
          isActive: true,
          showOnWalkthrough: true,
        },
        select: {
          id: true,
          name: true,
          description: true,
        },
        orderBy: [{ walkthroughOrder: "asc" }, { basePriority: "asc" }, { name: "asc" }],
      },
    },
    orderBy: { name: "asc" },
  });

  return categories.filter((cat) => cat.tasks.length > 0);
}

export async function countPublicWalkthroughTasks(): Promise<number> {
  return prisma.workTask.count({
    where: {
      isActive: true,
      showOnWalkthrough: true,
      category: { isActive: true },
    },
  });
}

export async function validateRequestedWalkthroughTaskIds(
  requestedWorkTaskIds: string[],
): Promise<
  | { ok: true; tasks: { id: string; name: string }[] }
  | { ok: false; error: string }
> {
  const uniqueIds = [...new Set(requestedWorkTaskIds)];

  if (uniqueIds.length === 0) {
    return { ok: false, error: "Please select at least one support option." };
  }

  const tasks = await prisma.workTask.findMany({
    where: {
      id: { in: uniqueIds },
      isActive: true,
      showOnWalkthrough: true,
      category: { isActive: true },
    },
    select: { id: true, name: true },
    orderBy: { name: "asc" },
  });

  if (tasks.length !== uniqueIds.length) {
    return {
      ok: false,
      error: "One or more selected support options are invalid or no longer available.",
    };
  }

  const nameById = new Map(tasks.map((t) => [t.id, t.name]));
  const ordered = uniqueIds.map((id) => ({
    id,
    name: nameById.get(id)!,
  }));

  return { ok: true, tasks: ordered };
}
