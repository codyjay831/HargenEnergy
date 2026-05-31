import "server-only";

import {
  AdminNotificationType,
  RequestStatus,
  SupportRequestKind,
} from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";

const SUMMARY_MAX_LENGTH = 500;

export type CreateAdminNotificationInput = {
  type: AdminNotificationType;
  supportRequestId: string;
  clientId: string;
  title: string;
  summary: string;
  attachmentCount?: number;
};

export type AdminAttentionItem = {
  id: string;
  type: AdminNotificationType;
  supportRequestId: string;
  clientId: string;
  companyName: string;
  title: string;
  summary: string;
  attachmentCount: number;
  createdAt: Date;
};

function truncateSummary(summary: string): string {
  const trimmed = summary.trim();
  if (trimmed.length <= SUMMARY_MAX_LENGTH) {
    return trimmed;
  }
  return `${trimmed.slice(0, SUMMARY_MAX_LENGTH - 3)}...`;
}

export async function createAdminNotification(
  input: CreateAdminNotificationInput,
): Promise<void> {
  await prisma.adminNotification.create({
    data: {
      type: input.type,
      supportRequestId: input.supportRequestId,
      clientId: input.clientId,
      title: input.title.trim(),
      summary: truncateSummary(input.summary),
      attachmentCount: input.attachmentCount ?? 0,
    },
  });
}

export async function markNotificationsReadForRequest(
  supportRequestId: string,
): Promise<void> {
  await prisma.adminNotification.updateMany({
    where: {
      supportRequestId,
      readAt: null,
    },
    data: {
      readAt: new Date(),
    },
  });
}

export async function getUnreadNotificationCount(): Promise<number> {
  return prisma.adminNotification.count({
    where: {
      readAt: null,
      supportRequest: {
        kind: SupportRequestKind.CLIENT_OPS,
        status: {
          notIn: [RequestStatus.COMPLETE, RequestStatus.CANCELLED],
        },
      },
    },
  });
}

export async function getAttentionItems(
  limit = 8,
): Promise<AdminAttentionItem[]> {
  const rows = await prisma.adminNotification.findMany({
    where: {
      readAt: null,
      supportRequest: {
        kind: SupportRequestKind.CLIENT_OPS,
        status: {
          notIn: [RequestStatus.COMPLETE, RequestStatus.CANCELLED],
        },
      },
    },
    orderBy: { createdAt: "desc" },
    take: limit,
    include: {
      client: { select: { companyName: true } },
    },
  });

  return rows.map((row) => ({
    id: row.id,
    type: row.type,
    supportRequestId: row.supportRequestId,
    clientId: row.clientId,
    companyName: row.client.companyName,
    title: row.title,
    summary: row.summary,
    attachmentCount: row.attachmentCount,
    createdAt: row.createdAt,
  }));
}

export async function getUnreadNotificationRequestIds(): Promise<Set<string>> {
  const rows = await prisma.adminNotification.findMany({
    where: {
      readAt: null,
      supportRequest: {
        kind: SupportRequestKind.CLIENT_OPS,
        status: {
          notIn: [RequestStatus.COMPLETE, RequestStatus.CANCELLED],
        },
      },
    },
    select: { supportRequestId: true },
    distinct: ["supportRequestId"],
  });
  return new Set(rows.map((row) => row.supportRequestId));
}

export async function getAttentionFilterRequestIds(): Promise<string[]> {
  const rows = await prisma.adminNotification.findMany({
    where: {
      readAt: null,
      supportRequest: {
        kind: SupportRequestKind.CLIENT_OPS,
        status: {
          notIn: [RequestStatus.COMPLETE, RequestStatus.CANCELLED],
        },
      },
    },
    orderBy: { createdAt: "desc" },
    select: { supportRequestId: true },
  });

  const seen = new Set<string>();
  const ids: string[] = [];
  for (const row of rows) {
    if (!seen.has(row.supportRequestId)) {
      seen.add(row.supportRequestId);
      ids.push(row.supportRequestId);
    }
  }
  return ids;
}

export async function hasUnreadNotificationsForRequest(
  supportRequestId: string,
): Promise<boolean> {
  const count = await prisma.adminNotification.count({
    where: {
      supportRequestId,
      readAt: null,
    },
  });
  return count > 0;
}
