import { Prisma } from "@/generated/prisma/client";
import { CATALOG_V2 } from "@/lib/catalog-v2-data";
import { prisma } from "@/lib/prisma";

export async function insertCatalogV2(tx: Prisma.TransactionClient) {
  for (const cat of CATALOG_V2) {
    await tx.serviceCategory.create({
      data: {
        name: cat.name,
        description: cat.description,
        tasks: {
          create: cat.tasks.map((task, index) => ({
            name: task.name,
            description: task.description,
            maxMinutes: task.maxMinutes,
            isActive: true,
            basePriority: index,
            suggestedHandoffTier: task.suggestedHandoffTier,
            suggestedPricingMode: task.suggestedPricingMode,
            showOnWalkthrough: task.showOnWalkthrough ?? false,
            walkthroughOrder: task.walkthroughOrder ?? 0,
          })),
        },
      },
    });
  }
}

export async function ensureCatalogSeeded(): Promise<{ seeded: boolean }> {
  const count = await prisma.serviceCategory.count();
  if (count > 0) {
    return { seeded: false };
  }

  await prisma.$transaction(async (tx) => {
    await insertCatalogV2(tx);
  });
  return { seeded: true };
}
