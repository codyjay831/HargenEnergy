"use server";

import { prisma } from "@/lib/prisma";
import { Prisma } from "@/generated/prisma/client";
import { revalidatePath } from "next/cache";
import { ensureCatalogSeeded, insertCatalogV2 } from "@/lib/catalog-seed";
import { requireStaff } from "@/lib/auth-guards";

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
  await requireStaff("catalog.manage");

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
  await requireStaff("catalog.manage");

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
  await requireStaff("catalog.manage");

  await prisma.serviceCategory.update({
    where: { id },
    data: { isActive },
  });

  revalidatePath("/admin/services");
  revalidatePath("/portal/requests/new");
  revalidatePath("/request-help");
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
  showOnDiscovery?: boolean;
  discoveryOrder?: number;
  maxMinutes?: number;
  requiredDocs?: string[];
  requiredFields?: CustomField[];
  basePriority?: number;
}) {
  await requireStaff("catalog.manage");

  try {
    const task = await prisma.workTask.upsert({
      where: { id: data.id || "new" },
      update: {
        name: data.name,
        description: data.description,
        isActive: data.isActive,
        showOnDiscovery: data.showOnDiscovery,
        discoveryOrder: data.discoveryOrder,
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
        showOnDiscovery: data.showOnDiscovery ?? false,
        discoveryOrder: data.discoveryOrder ?? 0,
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
    revalidatePath("/request-help");
    return task;
  } catch (error) {
    console.error("Error in upsertWorkTask:", error);
    throw error;
  }
}

export async function toggleWorkTask(id: string, isActive: boolean) {
  await requireStaff("catalog.manage");

  await prisma.workTask.update({
    where: { id },
    data: { isActive },
  });

  revalidatePath("/admin/services");
  revalidatePath("/portal/requests/new");
  revalidatePath("/request-help");
}

async function purgeInactiveCatalog(tx: Prisma.TransactionClient) {
  await tx.clientApprovedWorkTask.deleteMany({
    where: { workTask: { isActive: false } },
  });
  await tx.recurringTask.deleteMany({
    where: { workTask: { isActive: false } },
  });
  await tx.supportRequestWorkTask.deleteMany({
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
  await requireStaff("catalog.manage");

  if (confirmation !== "PURGE_RETIRED_CATALOG") {
    return { error: 'Type "PURGE_RETIRED_CATALOG" to confirm removal of retired catalog rows.' };
  }

  await prisma.$transaction(async (tx) => {
    await purgeInactiveCatalog(tx);
  });

  revalidatePath("/admin/services");
  revalidatePath("/portal/requests/new");
  revalidatePath("/request-help");
  revalidatePath("/admin/clients");
  return { message: "Retired catalog rows removed" };
}

export async function seedInitialServices() {
  await requireStaff("catalog.manage");

  const { seeded } = await ensureCatalogSeeded();
  if (!seeded) return { message: "Already seeded" };

  revalidatePath("/admin/services");
  revalidatePath("/portal/requests/new");
  revalidatePath("/request-help");
  return { message: "Seeded catalog v2 successfully" };
}

export async function replaceCatalogWithV2(confirmation: string) {
  await requireStaff("catalog.manage");

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
  revalidatePath("/request-help");
  revalidatePath("/admin/clients");
  return { message: "Catalog replaced with v2; retired rows removed" };
}
