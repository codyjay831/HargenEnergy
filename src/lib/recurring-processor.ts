import { addDays, addMonths, addWeeks } from "date-fns";
import {
  EngagementType,
  RecurringFrequency,
  RequestStatus,
  SupportRequestKind,
  SupportRequestSource,
  Urgency,
} from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";

function computeNextRunAt(
  current: Date,
  frequency: RecurringFrequency,
  now: Date,
): Date {
  let next = current;
  if (frequency === RecurringFrequency.DAILY) {
    next = addDays(next, 1);
  } else if (frequency === RecurringFrequency.WEEKLY) {
    next = addWeeks(next, 1);
  } else {
    next = addMonths(next, 1);
  }

  while (next <= now) {
    if (frequency === RecurringFrequency.DAILY) next = addDays(next, 1);
    else if (frequency === RecurringFrequency.WEEKLY) next = addWeeks(next, 1);
    else next = addMonths(next, 1);
  }
  return next;
}

export async function processRecurringTasksInternal(
  now = new Date(),
): Promise<{ createdCount: number }> {
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
    if (task.client.engagementType !== EngagementType.SUPPORT_BLOCK) {
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

    const nextRunAt = computeNextRunAt(task.nextRunAt, task.frequency, now);
    await prisma.recurringTask.update({
      where: { id: task.id },
      data: { nextRunAt },
    });
    createdCount++;
  }

  return { createdCount };
}
