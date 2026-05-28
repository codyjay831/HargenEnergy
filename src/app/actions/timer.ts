"use server";

import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import {
  BillableType,
  EngagementType,
  HandoffTier,
  PricingMode,
  TimeEntryStatus,
} from "@/generated/prisma/client";
import { isRequestBasedPricingComplete } from "@/lib/engagement";
import {
  assertClientCanStartWork,
  checkClientCanStartWork,
} from "@/lib/client-work-eligibility-guard";

type TimerRequestContext = {
  timerStartedAt: Date | null;
  clientId: string;
  handoffTier: HandoffTier | null;
  pricingMode: PricingMode | null;
  flatPriceCents: number | null;
  client: { engagementType: EngagementType };
};

const timerRequestSelect = {
  timerStartedAt: true,
  clientId: true,
  handoffTier: true,
  pricingMode: true,
  flatPriceCents: true,
  client: { select: { engagementType: true } },
} as const;

function billableTypeForTimerEntry(request: TimerRequestContext): BillableType {
  if (request.client.engagementType !== EngagementType.REQUEST_BASED) {
    return BillableType.INCLUDED;
  }

  if (!isRequestBasedPricingComplete(request)) {
    return BillableType.NON_BILLABLE;
  }

  return BillableType.INCLUDED;
}

async function assertWorkAllowedForRequest(requestId: string) {
  const request = await prisma.supportRequest.findUnique({
    where: { id: requestId },
    select: { clientId: true },
  });

  if (!request) {
    throw new Error("Support request not found.");
  }

  await assertClientCanStartWork(request.clientId, {
    entryPoint: "admin_start_timer",
    requestId,
  });
}

export async function startTimer(requestId: string) {
  const session = await auth();
  if (!session?.user || session.user.role !== "ADMIN") {
    throw new Error("Unauthorized");
  }

  await assertWorkAllowedForRequest(requestId);

  await prisma.supportRequest.update({
    where: { id: requestId },
    data: {
      timerStartedAt: new Date(),
      blockerReason: null,
    },
  });

  revalidatePath(`/admin/requests/${requestId}`);
}

export async function pauseTimer(requestId: string, reason: string) {
  const session = await auth();
  if (!session?.user || session.user.role !== "ADMIN") {
    throw new Error("Unauthorized");
  }

  const request = await prisma.supportRequest.findUnique({
    where: { id: requestId },
    select: timerRequestSelect,
  });

  if (!request?.timerStartedAt) return;

  const now = new Date();
  const elapsedMinutes = Math.round(
    (now.getTime() - request.timerStartedAt.getTime()) / 60000,
  );

  let blockedMessage: string | null = null;
  if (elapsedMinutes > 0) {
    const workGate = await checkClientCanStartWork(request.clientId, {
      entryPoint: "admin_pause_timer",
      requestId,
      actorId: session.user.id,
    });
    if (!workGate.ok) {
      blockedMessage = workGate.message;
    } else {
      await prisma.timeEntry.create({
        data: {
          clientId: request.clientId,
          supportRequestId: requestId,
          date: now,
          minutes: elapsedMinutes,
          description: `Timer paused: ${reason}`,
          billableType: billableTypeForTimerEntry(request),
          status: TimeEntryStatus.STAGED,
          createdById: session.user.id,
        },
      });
    }
  }

  const resolvedBlockerReason = blockedMessage
    ? `${reason} (work blocked: ${blockedMessage})`
    : reason;

  await prisma.supportRequest.update({
    where: { id: requestId },
    data: {
      timerStartedAt: null,
      blockerReason: resolvedBlockerReason,
    },
  });

  revalidatePath(`/admin/requests/${requestId}`);
  if (blockedMessage) {
    return {
      blocked: true,
      message: blockedMessage,
      elapsedMinutes: 0,
      timeEntryId: null,
    };
  }
}

export async function stopTimer(requestId: string) {
  const session = await auth();
  if (!session?.user || session.user.role !== "ADMIN") {
    throw new Error("Unauthorized");
  }

  const request = await prisma.supportRequest.findUnique({
    where: { id: requestId },
    select: timerRequestSelect,
  });

  if (!request?.timerStartedAt) return;

  const now = new Date();
  const elapsedMinutes = Math.round(
    (now.getTime() - request.timerStartedAt.getTime()) / 60000,
  );

  let blockedMessage: string | null = null;
  let timeEntryId = null;
  if (elapsedMinutes > 0) {
    const workGate = await checkClientCanStartWork(request.clientId, {
      entryPoint: "admin_stop_timer",
      requestId,
      actorId: session.user.id,
    });
    if (!workGate.ok) {
      blockedMessage = workGate.message;
    } else {
      const entry = await prisma.timeEntry.create({
        data: {
          clientId: request.clientId,
          supportRequestId: requestId,
          date: now,
          minutes: elapsedMinutes,
          description: "Timer session",
          billableType: billableTypeForTimerEntry(request),
          status: TimeEntryStatus.STAGED,
          createdById: session.user.id,
        },
      });
      timeEntryId = entry.id;
    }
  }

  await prisma.supportRequest.update({
    where: { id: requestId },
    data: {
      timerStartedAt: null,
      blockerReason: blockedMessage,
    },
  });

  revalidatePath(`/admin/requests/${requestId}`);
  if (blockedMessage) {
    return { blocked: true, message: blockedMessage, elapsedMinutes: 0, timeEntryId: null };
  }
  return { elapsedMinutes, timeEntryId };
}
