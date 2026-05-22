"use server";

import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { Prisma } from "@/generated/prisma/client";
import { revalidatePath } from "next/cache";
import { CATALOG_V2 } from "@/lib/catalog-v2-data";

export async function getActiveServices() {
  return await prisma.serviceCategory.findMany({
    where: { isActive: true },
    include: {
      tasks: {
        where: { isActive: true },
        orderBy: { basePriority: "asc" },
      },
    },
    orderBy: { name: "asc" },
  });
}

export async function getServiceCategories() {
  const session = await auth();
  if (!session?.user || session.user.role !== "ADMIN") {
    throw new Error("Unauthorized");
  }

  return await prisma.serviceCategory.findMany({
    where: { isActive: true },
    include: {
      tasks: {
        where: { isActive: true },
        orderBy: { basePriority: "asc" },
      },
    },
    orderBy: { name: "asc" },
  });
}

export async function upsertServiceCategory(data: {
  id?: string;
  name: string;
  description?: string;
  isActive?: boolean;
}) {
  const session = await auth();
  if (!session?.user || session.user.role !== "ADMIN") {
    throw new Error("Unauthorized");
  }

  const category = await prisma.serviceCategory.upsert({
    where: { id: data.id || "new" },
    update: {
      name: data.name,
      description: data.description,
      isActive: data.isActive,
    },
    create: {
      name: data.name,
      description: data.description,
      isActive: data.isActive ?? true,
    },
  });

  revalidatePath("/admin/services");
  revalidatePath("/portal/requests/new");
  return category;
}

export async function toggleServiceCategory(id: string, isActive: boolean) {
  const session = await auth();
  if (!session?.user || session.user.role !== "ADMIN") {
    throw new Error("Unauthorized");
  }

  await prisma.serviceCategory.update({
    where: { id },
    data: { isActive },
  });

  revalidatePath("/admin/services");
  revalidatePath("/portal/requests/new");
}

export interface CustomField {
  id: string;
  label: string;
  type: "text" | "number" | "date" | "select";
  required: boolean;
  options?: string[];
}

export async function upsertWorkTask(data: {
  id?: string;
  categoryId: string;
  name: string;
  description?: string;
  isActive?: boolean;
  maxMinutes?: number;
  requiredDocs?: string[];
  requiredFields?: CustomField[];
  basePriority?: number;
}) {
  const session = await auth();
  if (!session?.user || session.user.role !== "ADMIN") {
    throw new Error("Unauthorized");
  }

  try {
    const task = await prisma.workTask.upsert({
      where: { id: data.id || "new" },
      update: {
        name: data.name,
        description: data.description,
        isActive: data.isActive,
        maxMinutes: data.maxMinutes,
        requiredDocs: (data.requiredDocs ?? undefined) as
          | Prisma.InputJsonValue
          | undefined,
        requiredFields: (data.requiredFields ?? undefined) as
          | Prisma.InputJsonValue
          | undefined,
        basePriority: data.basePriority,
      },
      create: {
        categoryId: data.categoryId,
        name: data.name,
        description: data.description,
        isActive: data.isActive ?? true,
        maxMinutes: data.maxMinutes,
        requiredDocs: (data.requiredDocs ?? undefined) as
          | Prisma.InputJsonValue
          | undefined,
        requiredFields: (data.requiredFields ?? undefined) as
          | Prisma.InputJsonValue
          | undefined,
        basePriority: data.basePriority ?? 0,
      },
    });

    revalidatePath("/admin/services");
    revalidatePath("/portal/requests/new");
    return task;
  } catch (error) {
    console.error("Error in upsertWorkTask:", error);
    throw error;
  }
}

export async function toggleWorkTask(id: string, isActive: boolean) {
  const session = await auth();
  if (!session?.user || session.user.role !== "ADMIN") {
    throw new Error("Unauthorized");
  }

  await prisma.workTask.update({
    where: { id },
    data: { isActive },
  });

  revalidatePath("/admin/services");
  revalidatePath("/portal/requests/new");
}

async function purgeInactiveCatalog(tx: Prisma.TransactionClient) {
  await tx.clientApprovedWorkTask.deleteMany({
    where: { workTask: { isActive: false } },
  });
  await tx.recurringTask.deleteMany({
    where: { workTask: { isActive: false } },
  });
  await tx.supportRequest.updateMany({
    where: { workTask: { isActive: false } },
    data: { workTaskId: null },
  });
  await tx.workTask.deleteMany({ where: { isActive: false } });
  await tx.serviceCategory.deleteMany({ where: { isActive: false } });
}

export async function purgeInactiveCatalogAction(confirmation: string) {
  const session = await auth();
  if (!session?.user || session.user.role !== "ADMIN") {
    throw new Error("Unauthorized");
  }

  if (confirmation !== "PURGE_RETIRED_CATALOG") {
    return { error: 'Type "PURGE_RETIRED_CATALOG" to confirm removal of retired catalog rows.' };
  }

  await prisma.$transaction(async (tx) => {
    await purgeInactiveCatalog(tx);
  });

  revalidatePath("/admin/services");
  revalidatePath("/portal/requests/new");
  revalidatePath("/admin/clients");
  return { message: "Retired catalog rows removed" };
}

async function insertCatalogV2(tx: Prisma.TransactionClient) {
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
          })),
        },
      },
    });
  }
}

export async function seedInitialServices() {
  const session = await auth();
  if (!session?.user || session.user.role !== "ADMIN") {
    throw new Error("Unauthorized");
  }

  const count = await prisma.serviceCategory.count();
  if (count > 0) return { message: "Already seeded" };

  await prisma.$transaction(async (tx) => {
    await insertCatalogV2(tx);
  });

  revalidatePath("/admin/services");
  revalidatePath("/portal/requests/new");
  return { message: "Seeded catalog v2 successfully" };
}

export async function replaceCatalogWithV2(confirmation: string) {
  const session = await auth();
  if (!session?.user || session.user.role !== "ADMIN") {
    throw new Error("Unauthorized");
  }

  if (confirmation !== "REPLACE_CATALOG_V2") {
    return { error: 'Type "REPLACE_CATALOG_V2" to confirm catalog replacement.' };
  }

  await prisma.$transaction(async (tx) => {
    await tx.workTask.updateMany({ data: { isActive: false } });
    await tx.serviceCategory.updateMany({ data: { isActive: false } });
    await insertCatalogV2(tx);
    await purgeInactiveCatalog(tx);
  });

  revalidatePath("/admin/services");
  revalidatePath("/portal/requests/new");
  revalidatePath("/admin/clients");
  return { message: "Catalog replaced with v2; retired rows removed" };
}
