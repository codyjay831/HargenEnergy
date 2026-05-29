"use server";

import { revalidatePath } from "next/cache";
import {
  BlockWorkActivityType,
  BlockWorkItemState,
  RequestStatus,
  SupportRequestKind,
  SupportRequestSource,
  Urgency,
} from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";
import {
  canClientUseBlockWork,
  clampBlockWorkPriorityRank,
  isBlockWorkboardEnabled,
  isWorkTaskApprovedForClientBlock,
  lowerPriorityRankOnClientNudge,
} from "@/lib/block-work-policy";
import {
  blockWorkAdminUpdateSchema,
  blockWorkConvertToRequestSchema,
  blockWorkNudgeSchema,
  blockWorkPriorityUpdateSchema,
  blockWorkStateUpdateSchema,
} from "@/lib/validations";
import { checkRateLimit } from "@/lib/rate-limit";
import { writeAuditLog } from "@/lib/audit-log";
import { requireClientUser, requireStaff } from "@/lib/auth-guards";
import { loadAdminBlockWorkboard, loadPortalBlockWorkboard } from "@/lib/block-work";

function revalidateBlockWorkSurfaces(clientId?: string): void {
  revalidatePath("/admin/block-work");
  revalidatePath("/portal/block-work");
  if (clientId) {
    revalidatePath(`/admin/clients/${clientId}`);
    revalidatePath("/portal");
  }
}

type BlockWorkActionError = { error: string };

export async function getPortalBlockWorkboard(clientId: string) {
  const session = await requireClientUser("portal.work");
  if (!isBlockWorkboardEnabled()) {
    return { error: "Block workboard is currently unavailable." as const };
  }
  if (session.user.clientId !== clientId) {
    return { error: "Forbidden." as const };
  }
  const items = await loadPortalBlockWorkboard(clientId);
  return { items };
}

export async function getAdminBlockWorkboard() {
  await requireStaff("ops.full");
  if (!isBlockWorkboardEnabled()) {
    return { error: "Block workboard is currently unavailable." as const };
  }
  const items = await loadAdminBlockWorkboard();
  return { items };
}

export async function nudgeBlockWorkItem(input: {
  blockWorkItemId: string;
  note?: string;
  volumeHint?: number | null;
  desiredWindow?: string;
}): Promise<{ success: true; priorityRank: number } | BlockWorkActionError> {
  const session = await requireClientUser("portal.work");
  if (!isBlockWorkboardEnabled()) {
    return { error: "Block workboard is currently unavailable." };
  }

  const parsed = blockWorkNudgeSchema.safeParse(input);
  if (!parsed.success) {
    return { error: "Please review your nudge details and try again." };
  }

  const limit = await checkRateLimit("portal-block-nudge", `user:${session.user.id}`);
  if (!limit.allowed) {
    return { error: "Too many nudges right now. Please try again later." };
  }

  const { blockWorkItemId, note, volumeHint, desiredWindow } = parsed.data;
  const now = new Date();

  const result = await prisma.$transaction(async (tx) => {
    const item = await tx.blockWorkItem.findUnique({
      where: { id: blockWorkItemId },
      include: {
        client: {
          select: {
            id: true,
            status: true,
            engagementType: true,
            approvedWorkTasks: { select: { workTaskId: true } },
            serviceModels: { select: { modelType: true, isActive: true } },
          },
        },
        workTask: { select: { id: true, name: true } },
      },
    });

    if (!item) {
      return { error: "Block work item not found." } as const;
    }

    if (item.clientId !== session.user.clientId) {
      return { error: "Forbidden." } as const;
    }

    const blockAccess = canClientUseBlockWork(item.client);
    if (!blockAccess.ok) {
      return { error: blockAccess.error } as const;
    }

    if (!isWorkTaskApprovedForClientBlock(item.client, item.workTaskId)) {
      return {
        error:
          "This task is no longer approved for Support Block work. Ask Hargen to review scope.",
      } as const;
    }

    if (item.state !== BlockWorkItemState.ACTIVE) {
      return { error: "This block task is not currently active." } as const;
    }

    const nextPriorityRank = lowerPriorityRankOnClientNudge(item.currentPriorityRank);
    const bodyParts = [
      note?.trim() || "Client requested increased attention.",
      volumeHint != null ? `Volume hint: ${volumeHint}` : null,
      desiredWindow ? `Desired window: ${desiredWindow}` : null,
    ].filter(Boolean);

    await tx.blockWorkItem.update({
      where: { id: item.id },
      data: {
        currentPriorityRank: nextPriorityRank,
        lastClientNudgeAt: now,
      },
    });

    await tx.blockWorkActivity.create({
      data: {
        blockWorkItemId: item.id,
        authorType: "CLIENT",
        authorUserId: session.user.id,
        activityType: BlockWorkActivityType.CLIENT_NUDGE,
        title: `Priority nudge for ${item.workTask.name}`,
        body: bodyParts.join("\n"),
        visibleToClient: true,
        metadata: {
          previousPriorityRank: item.currentPriorityRank,
          newPriorityRank: nextPriorityRank,
          volumeHint: volumeHint ?? null,
          desiredWindow: desiredWindow ?? null,
        },
      },
    });

    return { success: true as const, priorityRank: nextPriorityRank, clientId: item.clientId };
  });

  if ("error" in result) {
    return result;
  }

  await writeAuditLog({
    actorUserId: session.user.id,
    action: "BLOCK_WORK_CLIENT_NUDGE",
    entityType: "BlockWorkItem",
    entityId: input.blockWorkItemId,
    metadata: {
      priorityRank: result.priorityRank,
    },
  });

  revalidateBlockWorkSurfaces(result.clientId);
  return { success: true, priorityRank: result.priorityRank };
}

export async function addBlockWorkUpdate(input: {
  blockWorkItemId: string;
  title?: string;
  body: string;
  completedCount?: number | null;
  pendingCount?: number | null;
  visibleToClient?: boolean;
}): Promise<{ success: true } | BlockWorkActionError> {
  const session = await requireStaff("ops.full");
  if (!isBlockWorkboardEnabled()) {
    return { error: "Block workboard is currently unavailable." };
  }

  const parsed = blockWorkAdminUpdateSchema.safeParse(input);
  if (!parsed.success) {
    return { error: "Please review the update details and try again." };
  }

  const { blockWorkItemId, title, body, completedCount, pendingCount, visibleToClient } = parsed.data;
  const now = new Date();
  const item = await prisma.blockWorkItem.findUnique({
    where: { id: blockWorkItemId },
    select: { id: true, clientId: true, state: true },
  });
  if (!item) {
    return { error: "Block work item not found." };
  }
  if (item.state === BlockWorkItemState.ARCHIVED) {
    return { error: "Cannot update an archived block work item." };
  }

  await prisma.$transaction(async (tx) => {
    await tx.blockWorkActivity.create({
      data: {
        blockWorkItemId,
        authorType: "ADMIN",
        authorUserId: session.user.id,
        activityType: BlockWorkActivityType.ADMIN_UPDATE,
        title: title || "Block work update",
        body,
        visibleToClient: visibleToClient ?? true,
        metadata: {
          completedCount: completedCount ?? null,
          pendingCount: pendingCount ?? null,
        },
      },
    });

    await tx.blockWorkItem.update({
      where: { id: blockWorkItemId },
      data: { lastAdminUpdateAt: now },
    });
  });

  await writeAuditLog({
    actorUserId: session.user.id,
    action: "BLOCK_WORK_ADMIN_UPDATE",
    entityType: "BlockWorkItem",
    entityId: blockWorkItemId,
    metadata: {
      visibleToClient: visibleToClient ?? true,
      completedCount: completedCount ?? null,
      pendingCount: pendingCount ?? null,
    },
  });

  revalidateBlockWorkSurfaces(item.clientId);
  return { success: true };
}

export async function setBlockWorkPriority(input: {
  blockWorkItemId: string;
  priorityRank: number;
}): Promise<{ success: true; priorityRank: number } | BlockWorkActionError> {
  const session = await requireStaff("ops.full");
  if (!isBlockWorkboardEnabled()) {
    return { error: "Block workboard is currently unavailable." };
  }

  const parsed = blockWorkPriorityUpdateSchema.safeParse(input);
  if (!parsed.success) {
    return { error: "Please choose a valid priority." };
  }

  const nextRank = clampBlockWorkPriorityRank(parsed.data.priorityRank);
  const item = await prisma.blockWorkItem.update({
    where: { id: parsed.data.blockWorkItemId },
    data: { currentPriorityRank: nextRank },
    select: { id: true, clientId: true },
  });

  await prisma.blockWorkActivity.create({
    data: {
      blockWorkItemId: item.id,
      authorType: "ADMIN",
      authorUserId: session.user.id,
      activityType: BlockWorkActivityType.SYSTEM_NOTE,
      title: "Priority updated",
      body: `Priority set to P${nextRank}.`,
      visibleToClient: false,
      metadata: { priorityRank: nextRank },
    },
  });

  await writeAuditLog({
    actorUserId: session.user.id,
    action: "BLOCK_WORK_SET_PRIORITY",
    entityType: "BlockWorkItem",
    entityId: item.id,
    metadata: { priorityRank: nextRank },
  });

  revalidateBlockWorkSurfaces(item.clientId);
  return { success: true, priorityRank: nextRank };
}

export async function archiveOrPauseBlockWorkItem(input: {
  blockWorkItemId: string;
  state: "ACTIVE" | "PAUSED" | "ARCHIVED";
}): Promise<{ success: true } | BlockWorkActionError> {
  const session = await requireStaff("ops.full");
  if (!isBlockWorkboardEnabled()) {
    return { error: "Block workboard is currently unavailable." };
  }

  const parsed = blockWorkStateUpdateSchema.safeParse(input);
  if (!parsed.success) {
    return { error: "Please choose a valid state." };
  }

  const item = await prisma.blockWorkItem.update({
    where: { id: parsed.data.blockWorkItemId },
    data: { state: parsed.data.state as BlockWorkItemState },
    select: { id: true, clientId: true },
  });

  await prisma.blockWorkActivity.create({
    data: {
      blockWorkItemId: item.id,
      authorType: "ADMIN",
      authorUserId: session.user.id,
      activityType: BlockWorkActivityType.SYSTEM_NOTE,
      title: "State updated",
      body: `State changed to ${parsed.data.state}.`,
      visibleToClient: false,
      metadata: { state: parsed.data.state },
    },
  });

  await writeAuditLog({
    actorUserId: session.user.id,
    action: "BLOCK_WORK_SET_STATE",
    entityType: "BlockWorkItem",
    entityId: item.id,
    metadata: { state: parsed.data.state },
  });

  revalidateBlockWorkSurfaces(item.clientId);
  return { success: true };
}

export async function convertBlockWorkItemToRequest(input: {
  blockWorkItemId: string;
  title: string;
  description: string;
  urgency: string;
}): Promise<{ success: true; requestId: string } | BlockWorkActionError> {
  const session = await requireStaff("ops.full");
  if (!isBlockWorkboardEnabled()) {
    return { error: "Block workboard is currently unavailable." };
  }

  const parsed = blockWorkConvertToRequestSchema.safeParse(input);
  if (!parsed.success) {
    return { error: "Please review the request conversion details and try again." };
  }

  const { blockWorkItemId, title, description, urgency } = parsed.data;
  const urgencyEnum = urgency as Urgency;

  const result = await prisma.$transaction(async (tx) => {
    const item = await tx.blockWorkItem.findUnique({
      where: { id: blockWorkItemId },
      include: {
        client: { select: { id: true, companyName: true } },
        workTask: { select: { id: true, name: true } },
      },
    });
    if (!item) {
      return { error: "Block work item not found." } as const;
    }

    const request = await tx.supportRequest.create({
      data: {
        clientId: item.clientId,
        workTaskId: item.workTaskId,
        title,
        kind: SupportRequestKind.CLIENT_OPS,
        source: SupportRequestSource.ADMIN,
        supportNeeded: item.workTask.name,
        description,
        urgency: urgencyEnum,
        status: RequestStatus.NEW,
        metadata: {
          convertedFromBlockWork: true,
          blockWorkItemId: item.id,
        },
      },
      select: { id: true },
    });

    await tx.blockWorkActivity.create({
      data: {
        blockWorkItemId: item.id,
        authorType: "ADMIN",
        authorUserId: session.user.id,
        activityType: BlockWorkActivityType.CONVERTED_TO_REQUEST,
        title: "Converted to priced request",
        body: `Converted to request "${title}" (${request.id}).`,
        supportRequestId: request.id,
        visibleToClient: true,
        metadata: { supportRequestId: request.id },
      },
    });

    await tx.blockWorkItem.update({
      where: { id: item.id },
      data: { state: BlockWorkItemState.PAUSED },
    });

    return { success: true as const, requestId: request.id, clientId: item.clientId };
  });

  if ("error" in result) {
    return result;
  }

  await writeAuditLog({
    actorUserId: session.user.id,
    action: "BLOCK_WORK_CONVERT_TO_REQUEST",
    entityType: "BlockWorkItem",
    entityId: parsed.data.blockWorkItemId,
    metadata: { requestId: result.requestId },
  });

  revalidateBlockWorkSurfaces(result.clientId);
  revalidatePath("/admin/requests");
  revalidatePath(`/portal/requests/${result.requestId}`);
  return { success: true, requestId: result.requestId };
}
