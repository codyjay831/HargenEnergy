import {
  EngagementType,
  type PlanType,
} from "@/generated/prisma/client";
import {
  canSubmitPortalWork,
  getEngagementLabel,
} from "@/lib/engagement";
import { prisma } from "@/lib/prisma";

export type PortalSubmitCategory = {
  id: string;
  name: string;
  tasks: {
    id: string;
    name: string;
    description: string | null;
    requiredFields: unknown;
    requiredDocs: unknown;
  }[];
};

export type PortalSupportArea = {
  categoryName: string;
  tasks: { id: string; name: string }[];
};

export type ClientPortalSupportSetup = {
  engagementType: EngagementType;
  engagementLabel: string;
  isSupportBlock: boolean;
  isRequestBased: boolean;
  planType: PlanType;
  weeklyHours: number;
  subscriptionStatus: string | null;
  stripeCustomerId: string | null;
  categories: PortalSubmitCategory[];
  supportAreas: PortalSupportArea[];
  canSubmit: boolean;
  blockMessage?: string;
};

const TASK_SELECT = {
  id: true,
  name: true,
  description: true,
  requiredFields: true,
  requiredDocs: true,
} as const;

function deriveSupportAreas(categories: PortalSubmitCategory[]): PortalSupportArea[] {
  return categories.map((c) => ({
    categoryName: c.name,
    tasks: c.tasks.map((t) => ({ id: t.id, name: t.name })),
  }));
}

function toPortalCategories(
  categories: Array<{
    id: string;
    name: string;
    tasks: PortalSubmitCategory["tasks"];
  }>,
): PortalSubmitCategory[] {
  return categories
    .map((c) => ({ id: c.id, name: c.name, tasks: c.tasks }))
    .filter((c) => c.tasks.length > 0);
}

export async function getClientPortalSupportSetup(
  clientId: string,
): Promise<ClientPortalSupportSetup | { error: "Client not found." }> {
  const client = await prisma.client.findUnique({
    where: { id: clientId },
    include: {
      approvedWorkTasks: { select: { workTaskId: true } },
    },
  });

  if (!client) {
    return { error: "Client not found." };
  }

  const submitCheck = canSubmitPortalWork(client);
  const isRequestBased = client.engagementType === EngagementType.REQUEST_BASED;
  const isSupportBlock = client.engagementType === EngagementType.SUPPORT_BLOCK;

  const base = {
    engagementType: client.engagementType,
    engagementLabel: getEngagementLabel(client.engagementType),
    isSupportBlock,
    isRequestBased,
    planType: client.planType,
    weeklyHours: client.weeklyHours,
    subscriptionStatus: client.subscriptionStatus,
    stripeCustomerId: client.stripeCustomerId,
  };

  if (isRequestBased) {
    const rawCategories = await prisma.serviceCategory.findMany({
      where: { isActive: true },
      include: {
        tasks: {
          where: { isActive: true },
          orderBy: { basePriority: "asc" },
          select: TASK_SELECT,
        },
      },
      orderBy: { name: "asc" },
    });

    const categories = toPortalCategories(rawCategories);
    const hasTasks = categories.length > 0;

    return {
      ...base,
      categories,
      supportAreas: [],
      canSubmit: hasTasks,
      blockMessage: hasTasks
        ? undefined
        : "No work types are available right now. Contact Hargen.",
    };
  }

  const approvedIds = client.approvedWorkTasks.map((a) => a.workTaskId);
  if (approvedIds.length === 0) {
    return {
      ...base,
      categories: [],
      supportAreas: [],
      canSubmit: false,
      blockMessage: submitCheck.blockMessage,
    };
  }

  const rawCategories = await prisma.serviceCategory.findMany({
    where: { isActive: true },
    include: {
      tasks: {
        where: { id: { in: approvedIds }, isActive: true },
        orderBy: { basePriority: "asc" },
        select: TASK_SELECT,
      },
    },
    orderBy: { name: "asc" },
  });

  const categories = toPortalCategories(rawCategories);

  return {
    ...base,
    categories,
    supportAreas: deriveSupportAreas(categories),
    canSubmit: submitCheck.canSubmit && categories.length > 0,
    blockMessage: submitCheck.blockMessage,
  };
}
