"use server";

import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { 
  EngagementType,
  RecurringFrequency, 
  SupportRequestKind, 
  SupportRequestSource, 
  RequestStatus, 
  Urgency 
} from "@/generated/prisma/client";
import { addDays, addWeeks, addMonths } from "date-fns";

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
  if (client.engagementType !== EngagementType.BLOCK_SUPPORT) {
    throw new Error("Recurring templates are only for hourly support block clients.");
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

  const now = new Date();
  const tasksToRun = await prisma.recurringTask.findMany({
    where: {
      isActive: true,
      nextRunAt: { lte: now },
    },
    include: {
      workTask: true,
      client: true,
    },
  });

  let createdCount = 0;

  for (const task of tasksToRun) {
    if (task.client.engagementType !== EngagementType.BLOCK_SUPPORT) {
      continue;
    }

    await prisma.supportRequest.create({
      data: {
        clientId: task.clientId,
        workTaskId: task.workTaskId,
        title: `Recurring: ${task.workTask.name}`,
        kind: SupportRequestKind.CLIENT_OPS,
        source: SupportRequestSource.ADMIN,
        supportNeeded: task.workTask.name,
        description: `Automated recurring task for ${task.workTask.name}`,
        urgency: Urgency.NORMAL,
        status: RequestStatus.NEW,
      },
    });

    // Update next run date
    let nextRunAt = task.nextRunAt;
    if (task.frequency === RecurringFrequency.DAILY) {
      nextRunAt = addDays(nextRunAt, 1);
    } else if (task.frequency === RecurringFrequency.WEEKLY) {
      nextRunAt = addWeeks(nextRunAt, 1);
    } else if (task.frequency === RecurringFrequency.MONTHLY) {
      nextRunAt = addMonths(nextRunAt, 1);
    }

    // If nextRunAt is still in the past (e.g. task was missed for a long time), 
    // keep adding until it's in the future.
    while (nextRunAt <= now) {
      if (task.frequency === RecurringFrequency.DAILY) nextRunAt = addDays(nextRunAt, 1);
      else if (task.frequency === RecurringFrequency.WEEKLY) nextRunAt = addWeeks(nextRunAt, 1);
      else if (task.frequency === RecurringFrequency.MONTHLY) nextRunAt = addMonths(nextRunAt, 1);
    }

    await prisma.recurringTask.update({
      where: { id: task.id },
      data: { nextRunAt },
    });

    createdCount++;
  }

  revalidatePath("/admin/requests");
  revalidatePath("/admin/services");
  
  return { createdCount };
}
