import {
  SupportRequestKind,
  SupportRequestSource,
} from "@/generated/prisma/client";
import { formatIntakePlanLabel } from "@/lib/intake-plan";
import { prisma } from "@/lib/prisma";
import { formatUrgencyLabel } from "@/lib/ui-enums";

export type WalkthroughRequestTask = {
  id: string;
  name: string;
  description: string | null;
};

export type ClientWalkthroughRequest = {
  requestId: string;
  submittedAt: Date;
  bottleneck: string;
  planLabel: string;
  urgencyLabel: string;
  tasks: WalkthroughRequestTask[];
  taskIds: string[];
};

export { walkthroughScopeMatchesApproved, flattenApprovedTaskIds } from "@/lib/portal-walkthrough-utils";

export async function getClientWalkthroughRequest(
  clientId: string,
): Promise<ClientWalkthroughRequest | null> {
  const intake = await prisma.supportRequest.findFirst({
    where: {
      clientId,
      kind: SupportRequestKind.PROSPECT_INTAKE,
      source: SupportRequestSource.PUBLIC_FORM,
    },
    orderBy: { createdAt: "desc" },
    include: {
      requestedWorkTasks: {
        include: {
          workTask: {
            select: { id: true, name: true, description: true },
          },
        },
      },
    },
  });

  if (!intake) {
    return null;
  }

  const tasksFromJoin = intake.requestedWorkTasks.map((row) => ({
    id: row.workTask.id,
    name: row.workTask.name,
    description: row.workTask.description,
  }));

  const tasks =
    tasksFromJoin.length > 0
      ? tasksFromJoin
      : intake.supportNeeded
        ? intake.supportNeeded.split(", ").map((name, index) => ({
            id: `legacy-${index}`,
            name: name.trim(),
            description: null,
          }))
        : [];

  if (tasks.length === 0 && !intake.description) {
    return null;
  }

  const metadata = intake.metadata as { intakePlan?: string } | null;

  return {
    requestId: intake.id,
    submittedAt: intake.createdAt,
    bottleneck: intake.description,
    planLabel: formatIntakePlanLabel(metadata?.intakePlan),
    urgencyLabel: formatUrgencyLabel(intake.urgency),
    tasks,
    taskIds: tasksFromJoin.map((task) => task.id),
  };
}
