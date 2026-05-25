"use server";

import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import {
  EngagementType,
  RecurringFrequency,
} from "@/generated/prisma/client";
import { processRecurringTasksInternal } from "@/lib/recurring-processor";

export async function getRecurringTasks() {
  const session = await auth();
  if (!session?.user || session.user.role !== "ADMIN") {
    throw new Error("Unauthorized");
  }

  return await prisma.recurringTask.findMany({
    include: {
      client: true,
      workTask: {
        include: { category: true }
      }
    },
    orderBy: { nextRunAt: "asc" },
  });
}

export async function createRecurringTask(data: {
  workTaskId: string;
  clientId: string;
  frequency: RecurringFrequency;
  nextRunAt: Date;
}) {
  const session = await auth();
  if (!session?.user || session.user.role !== "ADMIN") {
    throw new Error("Unauthorized");
  }

  const client = await prisma.client.findUnique({
    where: { id: data.clientId },
    select: { engagementType: true },
  });
  if (!client) {
    throw new Error("Client not found");
  }
  if (client.engagementType !== EngagementType.SUPPORT_BLOCK) {
    throw new Error("Recurring templates are only for Support Block clients.");
  }

  const task = await prisma.recurringTask.create({
    data: {
      workTaskId: data.workTaskId,
      clientId: data.clientId,
      frequency: data.frequency,
      nextRunAt: data.nextRunAt,
    },
  });

  revalidatePath("/admin/services");
  return task;
}

export async function deleteRecurringTask(id: string) {
  const session = await auth();
  if (!session?.user || session.user.role !== "ADMIN") {
    throw new Error("Unauthorized");
  }

  await prisma.recurringTask.delete({
    where: { id },
  });

  revalidatePath("/admin/services");
}

export async function processRecurringTasks() {
  const session = await auth();
  if (!session?.user || session.user.role !== "ADMIN") {
    throw new Error("Unauthorized");
  }

  const { createdCount } = await processRecurringTasksInternal();

  revalidatePath("/admin/requests");
  revalidatePath("/admin/services");

  return { createdCount };
}
