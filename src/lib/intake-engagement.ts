import {
  EngagementType,
  SupportRequestKind,
  type PrismaClient,
} from "@/generated/prisma/client";

type ApplyIntakePrisma = Pick<
  PrismaClient,
  "supportRequest" | "clientApprovedWorkTask" | "client" | "workTask"
>;

export async function getLatestIntakeWorkTaskIds(
  prisma: ApplyIntakePrisma,
  clientId: string,
  requestId?: string,
): Promise<string[]> {
  const intake = await prisma.supportRequest.findFirst({
    where: {
      clientId,
      kind: SupportRequestKind.PROSPECT_INTAKE,
      ...(requestId ? { id: requestId } : {}),
    },
    orderBy: { createdAt: "desc" },
    select: {
      requestedWorkTasks: {
        select: { workTaskId: true },
      },
    },
  });

  return intake?.requestedWorkTasks.map((row) => row.workTaskId) ?? [];
}

export async function applyIntakeWorkTasksToClient(
  prisma: ApplyIntakePrisma,
  clientId: string,
  options?: { requestId?: string; setRequestBasedFromIntake?: boolean },
): Promise<
  | { ok: true; appliedCount: number; skippedCount: number; totalFromIntake: number }
  | { ok: false; error: string }
> {
  const intake = await prisma.supportRequest.findFirst({
    where: {
      clientId,
      kind: SupportRequestKind.PROSPECT_INTAKE,
      ...(options?.requestId ? { id: options.requestId } : {}),
    },
    orderBy: { createdAt: "desc" },
    include: {
      requestedWorkTasks: { select: { workTaskId: true } },
    },
  });

  if (!intake) {
    return { ok: false, error: "No discovery intake found for this client." };
  }

  const taskIds = intake.requestedWorkTasks.map((row) => row.workTaskId);
  if (taskIds.length === 0) {
    return { ok: false, error: "This discovery has no catalog work tasks to apply." };
  }

  const activeCount = await prisma.workTask.count({
    where: { id: { in: taskIds }, isActive: true },
  });
  if (activeCount !== taskIds.length) {
    return {
      ok: false,
      error: "One or more requested work tasks are inactive. Update the catalog or intake first.",
    };
  }

  const client = await prisma.client.findUnique({
    where: { id: clientId },
    include: { approvedWorkTasks: { select: { workTaskId: true } } },
  });

  if (!client) {
    return { ok: false, error: "Client not found." };
  }

  const existing = new Set(client.approvedWorkTasks.map((row) => row.workTaskId));
  const toAdd = taskIds.filter((id) => !existing.has(id));

  const metadata = intake.metadata as { intakePlan?: string } | null;
  const intakePlan = metadata?.intakePlan;
  const shouldSetRequestBased =
    options?.setRequestBasedFromIntake !== false &&
    (intakePlan === "request-based" || intakePlan === "one-time") &&
    client.approvedWorkTasks.length === 0;

  if (toAdd.length > 0) {
    await prisma.clientApprovedWorkTask.createMany({
      data: toAdd.map((workTaskId) => ({ clientId, workTaskId })),
      skipDuplicates: true,
    });
  }

  if (shouldSetRequestBased) {
    await prisma.client.update({
      where: { id: clientId },
      data: {
        engagementType: EngagementType.REQUEST_BASED,
        weeklyHours: 0,
      },
    });
  }

  return {
    ok: true,
    appliedCount: toAdd.length,
    skippedCount: taskIds.length - toAdd.length,
    totalFromIntake: taskIds.length,
  };
}
