"use server";

import { requireStaff } from "@/lib/auth-guards";
import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import {
  BillableType,
  EngagementType,
  HandoffTier,
  PricingMode,
  RequestPaymentStatus,
  TimeEntryStatus,
} from "@/generated/prisma/client";
import { assertRequestBasedBillableWorkAllowed } from "@/lib/engagement";
import {
  assertClientCanStartWork,
  checkClientCanStartWork,
  checkClientWorkTaskSubmit,
  loadClientCatalogContext,
} from "@/lib/client-work-eligibility-guard";

type TimerRequestContext = {
  timerStartedAt: Date | null;
  clientId: string;
  workTaskId: string | null;
  handoffTier: HandoffTier | null;
  pricingMode: PricingMode | null;
  flatPriceCents: number | null;
  paymentStatus: RequestPaymentStatus;
  client: { engagementType: EngagementType };
};

const timerRequestSelect = {
  timerStartedAt: true,
  clientId: true,
  workTaskId: true,
  handoffTier: true,
  pricingMode: true,
  flatPriceCents: true,
  paymentStatus: true,
  client: { select: { engagementType: true } },
} as const;

function billableTypeForTimerEntry(request: TimerRequestContext): BillableType {
  const billableGate = assertRequestBasedBillableWorkAllowed({
    engagementType: request.client.engagementType,
    request,
    billableType: BillableType.INCLUDED,
  });
  if (!billableGate.ok) {
    return BillableType.NON_BILLABLE;
  }

  return BillableType.INCLUDED;
}

async function assertWorkAllowedForRequest(params: {
  requestId: string;
  actorId: string;
  entryPoint: "admin_start_timer" | "admin_pause_timer" | "admin_stop_timer";
}) {
  const { requestId, actorId, entryPoint } = params;
  const request = await prisma.supportRequest.findUnique({
    where: { id: requestId },
    select: { clientId: true, workTaskId: true },
  });

  if (!request) {
    throw new Error("Support request not found.");
  }

  await assertClientCanStartWork(request.clientId, {
    entryPoint,
    actorId,
    requestId,
  });

  if (!request.workTaskId) {
    return;
  }

  const catalogClient = await loadClientCatalogContext(request.clientId);
  if (!catalogClient) {
    throw new Error("Client not found.");
  }

  const taskGate = await checkClientWorkTaskSubmit({
    clientId: request.clientId,
    client: catalogClient,
    workTaskId: request.workTaskId,
    options: {
      entryPoint,
      actorId,
      requestId,
      workTaskId: request.workTaskId,
    },
  });
  if (!taskGate.ok) {
    throw new Error(taskGate.error);
  }
}

export async function startTimer(requestId: string) {
  const session = await requireStaff("ops.full");

  await assertWorkAllowedForRequest({
    requestId,
    actorId: session.user.id,
    entryPoint: "admin_start_timer",
  });

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
  const session = await requireStaff("ops.full");

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
    if (request.workTaskId) {
      const catalogClient = await loadClientCatalogContext(request.clientId);
      if (!catalogClient) {
        throw new Error("Client not found.");
      }
      const taskGate = await checkClientWorkTaskSubmit({
        clientId: request.clientId,
        client: catalogClient,
        workTaskId: request.workTaskId,
        options: {
          entryPoint: "admin_pause_timer",
          requestId,
          actorId: session.user.id,
          workTaskId: request.workTaskId,
        },
      });
      if (!taskGate.ok) {
        blockedMessage = taskGate.error;
      }
    }

    if (blockedMessage) {
      // no-op; blocker message already populated
    } else {
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
  const session = await requireStaff("ops.full");

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
    if (request.workTaskId) {
      const catalogClient = await loadClientCatalogContext(request.clientId);
      if (!catalogClient) {
        throw new Error("Client not found.");
      }
      const taskGate = await checkClientWorkTaskSubmit({
        clientId: request.clientId,
        client: catalogClient,
        workTaskId: request.workTaskId,
        options: {
          entryPoint: "admin_stop_timer",
          requestId,
          actorId: session.user.id,
          workTaskId: request.workTaskId,
        },
      });
      if (!taskGate.ok) {
        blockedMessage = taskGate.error;
      }
    }

    if (blockedMessage) {
      // no-op; blocker message already populated
    } else {
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
