"use server";

import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { Prisma } from "@/generated/prisma/client";
import { revalidatePath } from "next/cache";

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
    include: {
      tasks: {
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

export async function seedInitialServices() {
  const session = await auth();
  if (!session?.user || session.user.role !== "ADMIN") {
    throw new Error("Unauthorized");
  }

  const count = await prisma.serviceCategory.count();
  if (count > 0) return { message: "Already seeded" };

  const initialData = [
    {
      name: "Solar",
      description: "Residential solar installation and operations",
      tasks: [
        { name: "Site Assessment / Site Visit", maxMinutes: 120, isActive: false },
        { name: "Preliminary Design & Proposal", maxMinutes: 45 },
        { name: "Final Engineering & Plan Set Coordination", maxMinutes: 60 },
        { name: "Permit Application Submission", maxMinutes: 45 },
        { name: "AHJ Permit Follow-up & Corrections", maxMinutes: 30 },
        { name: "Utility Interconnection Application", maxMinutes: 45 },
        { name: "Utility Deficiency / Resubmittal Handling", maxMinutes: 30 },
        { name: "Inspection Scheduling & Coordination", maxMinutes: 20 },
        { name: "PTO Tracking", maxMinutes: 15 },
        { name: "Monitoring Setup", maxMinutes: 20 },
      ]
    },
    {
      name: "Battery",
      description: "Energy storage systems",
      tasks: [
        { name: "Storage Sizing & Load Calculations", maxMinutes: 45 },
        { name: "Backup Circuit Design / Load Shedding Plan", maxMinutes: 60 },
        { name: "Remote Commissioning Support", maxMinutes: 30 },
        { name: "Battery Warranty Registration", maxMinutes: 15 },
      ]
    },
    {
      name: "Electrical",
      description: "EV chargers and service upgrades",
      tasks: [
        { name: "EV Charger Load Calculations", maxMinutes: 30 },
        { name: "EV Charger Permit Submission", maxMinutes: 30 },
        { name: "Main Panel Upgrade (MPU) Coordination", maxMinutes: 45 },
        { name: "Utility Service Upgrade Request", maxMinutes: 45 },
      ]
    },
    {
      name: "Roofing",
      description: "Roofing operations",
      tasks: [
        { name: "Roofing Permit Submission", maxMinutes: 30 },
        { name: "Material Take-off & Estimating", maxMinutes: 45 },
        { name: "HOA Approval Application & Follow-up", maxMinutes: 30 },
      ]
    },
    {
      name: "Admin & Operations",
      description: "General back-office support",
      tasks: [
        { name: "Lead Entry & CRM Audit", maxMinutes: 20 },
        { name: "Daily Lead Follow-up", maxMinutes: 60 },
        { name: "Customer Milestone Updates", maxMinutes: 30 },
        { name: "CRM Cleanup & Document Filing", maxMinutes: 45 },
      ]
    }
  ];

  for (const cat of initialData) {
    await prisma.serviceCategory.create({
      data: {
        name: cat.name,
        description: cat.description,
        tasks: {
          create: cat.tasks.map((task, index) => ({
            name: task.name,
            maxMinutes: task.maxMinutes,
            isActive: task.isActive ?? true,
            basePriority: index,
          }))
        }
      }
    });
  }

  revalidatePath("/admin/services");
  return { message: "Seeded successfully" };
}
