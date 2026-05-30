import {
  PlanType,
  Urgency,
  ClientStatus,
  RequestStatus,
  SupportRequestKind,
  SupportRequestSource,
  type PrismaClient,
} from "@/generated/prisma/client";
import { buildIntakeTitle } from "@/lib/request-lifecycle";
import { getIntakeClientMutationStrategy } from "@/lib/intake-client-upsert";
import { formatIntakePlanLabel } from "@/lib/intake-plan";
import { formatUrgencyLabel } from "@/lib/ui-enums";
import { getWeeklyHoursForPlanType } from "@/lib/support-plan-hours";
import type { RequestHelpInput } from "@/lib/validations";

export type IntakePrismaClient = Pick<
  PrismaClient,
  "client" | "supportRequest" | "supportRequestWorkTask" | "workTask"
>;

export type ResolvedDiscoveryTask = {
  id: string;
  name: string;
};

export type IntakeEmailPayload = {
  companyName: string;
  contactName: string;
  email: string;
  phone?: string | null;
  role?: string | null;
  website?: string | null;
  serviceArea?: string | null;
  tools?: string | null;
  takeOffPlate?: string | null;
  supportNeeded: string;
  plan: string;
  urgency: string;
  description: string;
  requestId: string;
  clientId: string;
  kind: SupportRequestKind;
  intakePlan: string;
  subjectPrefix?: string;
};

export function mapIntakePlanType(plan: string): PlanType | null {
  switch (plan) {
    case "light":
      return PlanType.LIGHT;
    case "core":
      return PlanType.CORE;
    case "priority":
      return PlanType.PRIORITY;
    default:
      return null;
  }
}

export function mapIntakeUrgency(urgency: string): Urgency {
  switch (urgency) {
    case "normal":
      return Urgency.NORMAL;
    case "this-week":
      return Urgency.THIS_WEEK;
    case "urgent":
      return Urgency.URGENT;
    case "ongoing":
      return Urgency.ONGOING;
    default:
      return Urgency.NORMAL;
  }
}

export function buildIntakeEmailPayload(
  data: RequestHelpInput & { normalizedEmail: string },
  clientId: string,
  requestId: string,
  resolvedTasks: ResolvedDiscoveryTask[],
  subjectPrefix?: string,
): IntakeEmailPayload {
  const {
    companyName,
    name,
    email,
    phone,
    role,
    website,
    serviceArea,
    tools,
    takeOffPlate,
    plan,
    urgency,
    bottleneck,
  } = data;

  const taskNames = resolvedTasks.map((task) => task.name);

  return {
    companyName,
    contactName: name,
    email,
    phone,
    role,
    website,
    serviceArea,
    tools,
    takeOffPlate,
    supportNeeded: taskNames.join(", "),
    plan: formatIntakePlanLabel(plan),
    urgency: formatUrgencyLabel(urgency),
    description: bottleneck,
    requestId,
    clientId,
    kind: SupportRequestKind.PROSPECT_INTAKE,
    intakePlan: plan,
    subjectPrefix,
  };
}

export async function persistPublicIntake(
  prisma: IntakePrismaClient,
  data: RequestHelpInput & {
    normalizedEmail: string;
    resolvedTasks: ResolvedDiscoveryTask[];
  },
): Promise<{
  clientId: string;
  requestId: string;
  emailPayload: IntakeEmailPayload;
}> {
  const {
    companyName,
    name,
    normalizedEmail,
    phone,
    website,
    serviceArea,
    role,
    tools,
    bottleneck,
    plan,
    urgency,
    takeOffPlate,
    resolvedTasks,
  } = data;

  const taskNames = resolvedTasks.map((task) => task.name);
  const taskIds = resolvedTasks.map((task) => task.id);

  if (taskIds.length === 0) {
    throw new Error("At least one discovery work task is required.");
  }

  const mappedPlanType = mapIntakePlanType(plan);
  const existingClient = await prisma.client.findUnique({
    where: { email: normalizedEmail },
  });
  const mutationStrategy = getIntakeClientMutationStrategy(existingClient?.status);

  const client =
    mutationStrategy === "create"
      ? await prisma.client.create({
          data: {
            companyName,
            contactName: name,
            email: normalizedEmail,
            phone,
            website,
            serviceArea,
            role,
            currentTools: tools,
            status: ClientStatus.LEAD,
            ...(mappedPlanType
              ? {
                  planType: mappedPlanType,
                  weeklyHours: getWeeklyHoursForPlanType(mappedPlanType),
                }
              : {}),
          },
        })
      : mutationStrategy === "update-lead" && existingClient
        ? await prisma.client.update({
            where: { id: existingClient.id },
            data: {
              companyName,
              contactName: name,
              phone,
              website,
              serviceArea,
              role,
              currentTools: tools,
              ...(mappedPlanType
                ? {
                    planType: mappedPlanType,
                    weeklyHours: getWeeklyHoursForPlanType(mappedPlanType),
                  }
                : {}),
            },
          })
        : existingClient!;

  const isReIntake = mutationStrategy === "preserve-existing";

  const supportRequest = await prisma.supportRequest.create({
    data: {
      clientId: client.id,
      title: buildIntakeTitle(taskNames),
      kind: SupportRequestKind.PROSPECT_INTAKE,
      source: SupportRequestSource.PUBLIC_FORM,
      supportNeeded: taskNames.join(", "),
      description: bottleneck,
      mostHelpful: takeOffPlate,
      metadata: isReIntake
        ? { intakePlan: plan, resubmissionFromActiveClient: true }
        : { intakePlan: plan },
      urgency: mapIntakeUrgency(urgency),
      status: RequestStatus.NEW,
      requestedWorkTasks: {
        create: taskIds.map((workTaskId) => ({ workTaskId })),
      },
    },
  });

  return {
    clientId: client.id,
    requestId: supportRequest.id,
    emailPayload: buildIntakeEmailPayload(
      data,
      client.id,
      supportRequest.id,
      resolvedTasks,
      isReIntake ? "[Re-intake]" : undefined,
    ),
  };
}
