import type { Prisma } from "@/generated/prisma/client";
import {
  BlockWorkActivityType,
  BlockWorkItemState,
  type AuthorType,
} from "@/generated/prisma/client";
import {
  BLOCK_WORK_DEFAULT_PRIORITY,
  clampBlockWorkPriorityRank,
  getBlockWorkPriorityLabel,
} from "@/lib/block-work-policy";
import { prisma } from "@/lib/prisma";

type ActivityWithAuthor = {
  id: string;
  activityType: BlockWorkActivityType;
  title: string | null;
  body: string;
  metadata: unknown;
  visibleToClient: boolean;
  createdAt: Date;
  authorType: AuthorType;
  authorUser: { name: string | null; email: string | null } | null;
};

export type BlockWorkActivityFeedItem = {
  id: string;
  activityType: BlockWorkActivityType;
  title: string | null;
  body: string;
  createdAt: Date;
  authorType: AuthorType;
  authorName: string;
};

export type BlockWorkboardItem = {
  id: string;
  state: BlockWorkItemState;
  currentPriorityRank: number;
  priorityLabel: string;
  task: {
    id: string;
    name: string;
    categoryName: string;
  };
  client?: {
    id: string;
    companyName: string;
  };
  pendingCount: number | null;
  completedCount: number | null;
  lastClientNudgeAt: Date | null;
  lastAdminUpdateAt: Date | null;
  lastVisibleUpdateAt: Date | null;
  activities: BlockWorkActivityFeedItem[];
};

type CountSnapshot = { pendingCount: number | null; completedCount: number | null };

function parseCountMetadata(
  metadata: unknown,
  key: "pendingCount" | "completedCount",
): number | null {
  if (!metadata || typeof metadata !== "object" || Array.isArray(metadata)) {
    return null;
  }
  const raw = (metadata as Record<string, unknown>)[key];
  if (typeof raw === "number" && Number.isFinite(raw)) {
    return Math.max(0, Math.round(raw));
  }
  return null;
}

function deriveCountsFromActivities(activities: ActivityWithAuthor[]): CountSnapshot {
  for (const activity of activities) {
    if (
      activity.activityType !== BlockWorkActivityType.ADMIN_UPDATE &&
      activity.activityType !== BlockWorkActivityType.PROGRESS_LOG
    ) {
      continue;
    }

    const pendingCount = parseCountMetadata(activity.metadata, "pendingCount");
    const completedCount = parseCountMetadata(activity.metadata, "completedCount");
    if (pendingCount !== null || completedCount !== null) {
      return { pendingCount, completedCount };
    }
  }
  return { pendingCount: null, completedCount: null };
}

function mapActivity(activity: ActivityWithAuthor): BlockWorkActivityFeedItem {
  return {
    id: activity.id,
    activityType: activity.activityType,
    title: activity.title,
    body: activity.body,
    createdAt: activity.createdAt,
    authorType: activity.authorType,
    authorName:
      activity.authorUser?.name ??
      activity.authorUser?.email ??
      (activity.authorType === "SYSTEM" ? "System" : "Hargen Team"),
  };
}

function mapItem(input: {
  id: string;
  state: BlockWorkItemState;
  currentPriorityRank: number;
  lastClientNudgeAt: Date | null;
  lastAdminUpdateAt: Date | null;
  workTask: { id: string; name: string; category: { name: string } };
  client?: { id: string; companyName: string };
  activities: ActivityWithAuthor[];
}): BlockWorkboardItem {
  const currentPriorityRank = clampBlockWorkPriorityRank(
    input.currentPriorityRank ?? BLOCK_WORK_DEFAULT_PRIORITY,
  );
  const counts = deriveCountsFromActivities(input.activities);
  const lastVisibleUpdateAt = input.activities[0]?.createdAt ?? null;

  return {
    id: input.id,
    state: input.state,
    currentPriorityRank,
    priorityLabel: getBlockWorkPriorityLabel(currentPriorityRank),
    task: {
      id: input.workTask.id,
      name: input.workTask.name,
      categoryName: input.workTask.category.name,
    },
    client: input.client,
    pendingCount: counts.pendingCount,
    completedCount: counts.completedCount,
    lastClientNudgeAt: input.lastClientNudgeAt,
    lastAdminUpdateAt: input.lastAdminUpdateAt,
    lastVisibleUpdateAt,
    activities: input.activities.map(mapActivity),
  };
}

export async function loadPortalBlockWorkboard(clientId: string): Promise<BlockWorkboardItem[]> {
  const items = await prisma.blockWorkItem.findMany({
    where: {
      clientId,
      state: { in: [BlockWorkItemState.ACTIVE, BlockWorkItemState.PAUSED] },
    },
    include: {
      workTask: {
        select: {
          id: true,
          name: true,
          category: { select: { name: true } },
        },
      },
      activities: {
        where: { visibleToClient: true },
        orderBy: { createdAt: "desc" },
        take: 12,
        select: {
          id: true,
          activityType: true,
          title: true,
          body: true,
          metadata: true,
          visibleToClient: true,
          createdAt: true,
          authorType: true,
          authorUser: { select: { name: true, email: true } },
        },
      },
    },
    orderBy: [{ currentPriorityRank: "asc" }, { updatedAt: "desc" }],
  });

  return items.map((item) => mapItem(item));
}

export async function loadAdminBlockWorkboard(): Promise<BlockWorkboardItem[]> {
  const items = await prisma.blockWorkItem.findMany({
    where: { state: { in: [BlockWorkItemState.ACTIVE, BlockWorkItemState.PAUSED] } },
    include: {
      client: { select: { id: true, companyName: true } },
      workTask: {
        select: {
          id: true,
          name: true,
          category: { select: { name: true } },
        },
      },
      activities: {
        orderBy: { createdAt: "desc" },
        take: 12,
        select: {
          id: true,
          activityType: true,
          title: true,
          body: true,
          metadata: true,
          visibleToClient: true,
          createdAt: true,
          authorType: true,
          authorUser: { select: { name: true, email: true } },
        },
      },
    },
    orderBy: [{ currentPriorityRank: "asc" }, { updatedAt: "desc" }],
  });

  return items.map((item) => mapItem(item));
}

export async function syncBlockWorkItemsForClient(params: {
  tx: Prisma.TransactionClient;
  clientId: string;
  approvedWorkTaskIds: string[];
  hasSupportBlock: boolean;
}): Promise<{ activeCount: number; archivedCount: number }> {
  const { tx, clientId, approvedWorkTaskIds, hasSupportBlock } = params;
  const nextApprovedIds = Array.from(new Set(approvedWorkTaskIds));

  if (!hasSupportBlock) {
    const archived = await tx.blockWorkItem.updateMany({
      where: {
        clientId,
        state: { in: [BlockWorkItemState.ACTIVE, BlockWorkItemState.PAUSED] },
      },
      data: { state: BlockWorkItemState.ARCHIVED },
    });
    return { activeCount: 0, archivedCount: archived.count };
  }

  for (const workTaskId of nextApprovedIds) {
    await tx.blockWorkItem.upsert({
      where: { clientId_workTaskId: { clientId, workTaskId } },
      create: {
        clientId,
        workTaskId,
        state: BlockWorkItemState.ACTIVE,
        currentPriorityRank: BLOCK_WORK_DEFAULT_PRIORITY,
      },
      update: {
        state: BlockWorkItemState.ACTIVE,
      },
    });
  }

  const archived = await tx.blockWorkItem.updateMany({
    where: {
      clientId,
      workTaskId: { notIn: nextApprovedIds.length > 0 ? nextApprovedIds : ["__none__"] },
      state: { in: [BlockWorkItemState.ACTIVE, BlockWorkItemState.PAUSED] },
    },
    data: { state: BlockWorkItemState.ARCHIVED },
  });

  return { activeCount: nextApprovedIds.length, archivedCount: archived.count };
}
