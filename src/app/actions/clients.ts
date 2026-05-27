"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import {
  BillingMode,
  ClientStatus,
  EngagementType,
  RequestStatus,
  Role,
  SupportRequestKind,
  SupportRequestSource,
  StaffRole,
  Urgency,
} from "@/generated/prisma/client";
import { requireStaff } from "@/lib/auth-guards";
import { validateClientBillingModeUpdate } from "@/lib/client-billing-mode";
import { prisma } from "@/lib/prisma";
import {
  assertWorkTaskAllowedForClient,
  resolveActiveWorkTask,
} from "@/lib/engagement";
import { isUrgencyValue, isEngagementTypeValue } from "@/lib/ui-enums";
import { updateClientEngagementSchema } from "@/lib/validations";
import { applyIntakeWorkTasksToClient } from "@/lib/intake-engagement";
import { sendInternalRequestAlert } from "@/lib/email";
import { writeAuditLog } from "@/lib/audit-log";
import {
  revalidateAdminClientPage,
  revalidatePortalClientSurfaces,
} from "@/lib/revalidate-paths";
import { resolveStaffRole } from "@/lib/permissions";
import type { Prisma } from "@/generated/prisma/client";

export async function updateClientBillingMode(data: {
  clientId: string;
  billingMode: string;
  reason?: string | null;
  expiresAt?: string | null;
}) {
  const session = await requireStaff();

  const validated = validateClientBillingModeUpdate(data);
  if (!validated.ok) {
    return { error: validated.error };
  }

  const client = await prisma.client.findUnique({ where: { id: data.clientId } });
  if (!client) {
    return { error: "Client not found." };
  }

  const { billingMode, billingOverrideReason, billingOverrideExpiresAt } = validated.data;
  const now = new Date();

  try {
    const updated = await prisma.client.update({
      where: { id: data.clientId },
      data:
        billingMode === BillingMode.STRIPE
          ? {
              billingMode: BillingMode.STRIPE,
              billingOverrideReason: null,
              billingOverrideExpiresAt: null,
              billingOverrideCreatedAt: null,
              billingOverrideCreatedById: null,
            }
          : {
              billingMode,
              billingOverrideReason,
              billingOverrideExpiresAt,
              billingOverrideCreatedAt: now,
              billingOverrideCreatedById: session.user.id,
            },
    });

    revalidateAdminClientPage(data.clientId);
    revalidatePath("/admin/billing");
    revalidatePath("/portal");
    revalidatePath("/portal/account");

    await writeAuditLog({
      actorUserId: session.user.id,
      action: "client.billing_mode_update",
      entityType: "Client",
      entityId: data.clientId,
      metadata: {
        before: {
          billingMode: client.billingMode,
          billingOverrideReason: client.billingOverrideReason,
          billingOverrideExpiresAt: client.billingOverrideExpiresAt?.toISOString() ?? null,
        },
        after: {
          billingMode: updated.billingMode,
          billingOverrideReason: updated.billingOverrideReason,
          billingOverrideExpiresAt: updated.billingOverrideExpiresAt?.toISOString() ?? null,
        },
      },
    });

    return { success: true, client: updated };
  } catch (error) {
    console.error("Error updating client billing mode:", error);
    return { error: "Failed to update billing mode." };
  }
}

export async function applyIntakeToApprovedWork(clientId: string, requestId?: string) {
  await requireStaff();

  const result = await applyIntakeWorkTasksToClient(prisma, clientId, {
    requestId,
    setRequestBasedFromIntake: true,
  });

  if (!result.ok) {
    return { error: result.error };
  }

  revalidateAdminClientPage(clientId);
  revalidatePortalClientSurfaces();

  return {
    success: true,
    appliedCount: result.appliedCount,
    skippedCount: result.skippedCount,
    totalFromIntake: result.totalFromIntake,
  };
}

export async function activateClient(clientId: string) {
  await requireStaff();

  const client = await prisma.client.findUnique({
    where: { id: clientId },
    include: { approvedWorkTasks: { select: { workTaskId: true } } },
  });
  if (!client) {
    return { error: "Client not found." };
  }

  if (client.status === ClientStatus.ACTIVE) {
    return { success: true as const };
  }

  try {
    await prisma.client.update({
      where: { id: clientId },
      data: {
        status: ClientStatus.ACTIVE,
        activatedAt: client.activatedAt ?? new Date(),
      },
    });

    if (client.approvedWorkTasks.length === 0) {
      await applyIntakeWorkTasksToClient(prisma, clientId, {
        setRequestBasedFromIntake: true,
      });
    }

    revalidateAdminClientPage(clientId);
    revalidatePortalClientSurfaces();
    return { success: true as const };
  } catch (error) {
    console.error("Error activating client:", error);
    return { error: "Failed to activate client." };
  }
}

const logOpsRequestSchema = z.object({
  clientId: z.string().min(1).max(128),
  title: z.string().trim().min(1).max(200),
  description: z.string().trim().min(1).max(8000),
  source: z.enum(["EMAIL", "PHONE", "TEXT", "VOICEMAIL", "ADMIN"]),
  urgency: z.string().optional(),
  supportNeeded: z.string().trim().max(500).optional(),
  workTaskId: z.string().min(1).max(128).optional(),
  adminOverride: z.boolean().optional(),
  overrideReason: z.string().trim().max(2000).optional(),
});

export async function updateClientEngagement(data: {
  clientId: string;
  engagementType: string;
  approvedWorkTaskIds: string[];
}) {
  await requireStaff();

  const parsed = updateClientEngagementSchema.safeParse(data);
  if (!parsed.success) {
    return { error: "Invalid engagement configuration." };
  }

  const { clientId, engagementType, approvedWorkTaskIds } = parsed.data;

  if (!isEngagementTypeValue(engagementType)) {
    return { error: "Invalid engagement type." };
  }

  const client = await prisma.client.findUnique({ where: { id: clientId } });
  if (!client) {
    return { error: "Client not found." };
  }

  if (engagementType === EngagementType.SUPPORT_BLOCK && approvedWorkTaskIds.length > 0) {
    const activeCount = await prisma.workTask.count({
      where: { id: { in: approvedWorkTaskIds }, isActive: true },
    });
    if (activeCount !== approvedWorkTaskIds.length) {
      return { error: "One or more approved work types are inactive or invalid." };
    }
  }

  try {
    await prisma.$transaction(async (tx) => {
      await tx.clientApprovedWorkTask.deleteMany({ where: { clientId } });

      if (engagementType === EngagementType.SUPPORT_BLOCK && approvedWorkTaskIds.length > 0) {
        await tx.clientApprovedWorkTask.createMany({
          data: approvedWorkTaskIds.map((workTaskId) => ({ clientId, workTaskId })),
        });
      }

      await tx.client.update({
        where: { id: clientId },
        data: {
          engagementType,
          weeklyHours:
            engagementType === EngagementType.REQUEST_BASED ? 0 : client.weeklyHours,
        },
      });
    });

    revalidateAdminClientPage(clientId);
    revalidatePortalClientSurfaces();

    return {
      success: true,
      engagementType,
      approvedCount:
        engagementType === EngagementType.SUPPORT_BLOCK
          ? approvedWorkTaskIds.length
          : 0,
      warnings:
        engagementType === EngagementType.SUPPORT_BLOCK &&
        approvedWorkTaskIds.length === 0
          ? ["No approved work types yet. Portal submit will be blocked."]
          : [],
    };
  } catch (error) {
    console.error("Error updating client engagement:", error);
    return { error: "Failed to update engagement settings." };
  }
}

export async function getClientEngagementConfig(clientId: string) {
  await requireStaff();

  const [client, categories] = await Promise.all([
    prisma.client.findUnique({
      where: { id: clientId },
      include: { approvedWorkTasks: { select: { workTaskId: true } } },
    }),
    prisma.serviceCategory.findMany({
      where: { isActive: true },
      include: {
        tasks: { where: { isActive: true }, orderBy: { basePriority: "asc" } },
      },
      orderBy: { name: "asc" },
    }),
  ]);

  if (!client) {
    return { error: "Client not found." };
  }

  return {
    client: {
      id: client.id,
      engagementType: client.engagementType,
      approvedWorkTaskIds: client.approvedWorkTasks.map((a) => a.workTaskId),
    },
    categories,
  };
}

export async function logClientOpsRequest(data: {
  clientId: string;
  title: string;
  description: string;
  source: string;
  urgency?: string;
  supportNeeded?: string;
  workTaskId?: string;
  adminOverride?: boolean;
  overrideReason?: string;
}) {
  await requireStaff();

  const parsed = logOpsRequestSchema.safeParse(data);
  if (!parsed.success) {
    return { error: "Please check the request fields and try again." };
  }

  const {
    clientId,
    title,
    description,
    source,
    supportNeeded,
    workTaskId,
    adminOverride,
    overrideReason,
  } = parsed.data;
  const urgency = parsed.data.urgency && isUrgencyValue(parsed.data.urgency)
    ? parsed.data.urgency
    : Urgency.NORMAL;

  const client = await prisma.client.findUnique({
    where: { id: clientId },
    include: { approvedWorkTasks: { select: { workTaskId: true } } },
  });
  if (!client) {
    return { error: "Client not found." };
  }

  if (client.status !== ClientStatus.ACTIVE) {
    return { error: "Log client ops requests only for active clients." };
  }

  let resolvedSupportNeeded = supportNeeded || null;
  let finalDescription = description;

  if (workTaskId) {
    const taskResult = await resolveActiveWorkTask(workTaskId, (id) =>
      prisma.workTask.findUnique({ where: { id } }),
    );
    if (!taskResult.ok) {
      return { error: taskResult.error };
    }

    const allowed = assertWorkTaskAllowedForClient({
      client,
      workTaskId,
      allowAdminOverride: adminOverride,
    });
    if (!allowed.ok) {
      return { error: allowed.error };
    }

    if (adminOverride && overrideReason) {
      finalDescription += `\n\n---\nAdmin override: ${overrideReason}`;
    }

    resolvedSupportNeeded = taskResult.workTask.name;
  }

  try {
    const supportRequest = await prisma.supportRequest.create({
      data: {
        clientId,
        workTaskId: workTaskId || null,
        title,
        kind: SupportRequestKind.CLIENT_OPS,
        source: source as SupportRequestSource,
        supportNeeded: resolvedSupportNeeded,
        description: finalDescription,
        urgency,
        status: RequestStatus.NEW,
      },
    });

    try {
      await sendInternalRequestAlert({
        companyName: client.companyName,
        contactName: client.contactName,
        email: client.email,
        phone: client.phone,
        supportNeeded: supportNeeded || null,
        plan: client.planType,
        urgency,
        description,
        requestId: supportRequest.id,
        kind: SupportRequestKind.CLIENT_OPS,
      });
    } catch (emailError) {
      console.error("Failed to send ops request alert:", emailError);
    }

    revalidatePath("/admin/requests");
    revalidateAdminClientPage(clientId);
    revalidatePath(`/admin/requests/${supportRequest.id}`);

    return { success: true, requestId: supportRequest.id };
  } catch (error) {
    console.error("Error logging client ops request:", error);
    return { error: "Failed to log client ops request." };
  }
}

async function assertOwnerStaff(userId: string): Promise<{ error: string } | null> {
  const actor = await prisma.user.findUnique({
    where: { id: userId },
    select: { staffRole: true },
  });
  if (!actor || resolveStaffRole(actor.staffRole) !== StaffRole.OWNER) {
    return { error: "Forbidden. Owner access required." };
  }
  return null;
}

async function deleteClientData(
  tx: Prisma.TransactionClient,
  clientId: string,
): Promise<void> {
  const requests = await tx.supportRequest.findMany({
    where: { clientId },
    select: { id: true },
  });
  const requestIds = requests.map((request) => request.id);

  if (requestIds.length > 0) {
    await tx.requestComment.deleteMany({
      where: { supportRequestId: { in: requestIds } },
    });
    await tx.supportRequestWorkTask.deleteMany({
      where: { requestId: { in: requestIds } },
    });
  }

  await tx.disbursementRequest.deleteMany({ where: { clientId } });
  await tx.discoveryAppointment.deleteMany({ where: { clientId } });
  await tx.discoverySchedulingLink.deleteMany({ where: { clientId } });
  await tx.attachment.deleteMany({ where: { clientId } });
  await tx.timeEntry.deleteMany({ where: { clientId } });
  await tx.recurringTask.deleteMany({ where: { clientId } });
  await tx.supportRequest.deleteMany({ where: { clientId } });
  await tx.user.deleteMany({ where: { clientId, role: Role.CLIENT } });
  await tx.client.delete({ where: { id: clientId } });
}

export async function archiveClient(clientId: string) {
  const session = await requireStaff("clients.manage");

  const client = await prisma.client.findUnique({
    where: { id: clientId },
    select: { id: true, companyName: true, status: true },
  });
  if (!client) {
    return { error: "Client not found." };
  }

  if (
    client.status !== ClientStatus.ACTIVE &&
    client.status !== ClientStatus.PAUSED
  ) {
    return {
      error: "Only active or paused clients can be archived.",
    };
  }

  const now = new Date();

  try {
    await prisma.$transaction(async (tx) => {
      await tx.client.update({
        where: { id: clientId },
        data: { status: ClientStatus.CANCELLED },
      });
      await tx.user.updateMany({
        where: { clientId, role: Role.CLIENT, deactivatedAt: null },
        data: { deactivatedAt: now },
      });
    });

    revalidateAdminClientPage(clientId);
    revalidatePortalClientSurfaces();
    revalidatePath("/admin/billing");

    await writeAuditLog({
      actorUserId: session.user.id,
      action: "client.archive",
      entityType: "Client",
      entityId: clientId,
      metadata: { companyName: client.companyName },
    });

    return { success: true };
  } catch (error) {
    console.error("Error archiving client:", error);
    return { error: "Failed to archive client." };
  }
}

export async function deleteClientPermanently(data: {
  clientId: string;
  confirmCompanyName: string;
}) {
  const session = await requireStaff("clients.manage");
  const ownerError = await assertOwnerStaff(session.user.id);
  if (ownerError) return ownerError;

  const clientId = data.clientId.trim();
  const confirmCompanyName = data.confirmCompanyName.trim();

  if (!clientId || !confirmCompanyName) {
    return { error: "Company name confirmation is required." };
  }

  const client = await prisma.client.findUnique({
    where: { id: clientId },
    select: { id: true, companyName: true, status: true },
  });
  if (!client) {
    return { error: "Client not found." };
  }

  if (client.companyName !== confirmCompanyName) {
    return { error: "Company name does not match." };
  }

  try {
    await prisma.$transaction(async (tx) => {
      await deleteClientData(tx, clientId);
    });

    revalidatePath("/admin/clients");
    revalidatePath("/admin/requests");
    revalidatePortalClientSurfaces();

    await writeAuditLog({
      actorUserId: session.user.id,
      action: "client.delete_permanent",
      entityType: "Client",
      entityId: clientId,
      metadata: { companyName: client.companyName, status: client.status },
    });

    return { success: true };
  } catch (error) {
    console.error("Error deleting client:", error);
    return { error: "Failed to delete client." };
  }
}
