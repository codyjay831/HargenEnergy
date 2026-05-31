"use server";

import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import {
  RequestStatus,
  Urgency,
  AuthorType,
  SupportRequestKind,
  SupportRequestSource,
  AdminNotificationType,
} from "@/generated/prisma/client";
import { canRequestScopeChange } from "@/lib/portal-submit-eligibility";
import {
  checkClientWorkTaskSubmit,
  checkPortalWorkSubmit,
  loadClientCatalogContext,
} from "@/lib/client-work-eligibility-guard";
import { getClientPortalSupportSetupForSession } from "@/lib/portal-support";
import { revalidatePath } from "next/cache";
import {
  sendInternalClientCommentAlert,
  sendInternalRequestAlert,
} from "@/lib/email";
import {
  createPortalSubmitRequestSchema,
  createPortalSubmitInfoResponseSchema,
  portalAddCommentSchema,
  requestScopeChangeSchema,
} from "@/lib/validations";
import { checkRateLimit } from "@/lib/rate-limit";
import { requireClientUser } from "@/lib/auth-guards";
import { validateRequestedDiscoveryTaskIds } from "@/lib/discovery-catalog";
import { writeAuditLog } from "@/lib/audit-log";
import {
  buildInfoResponseCommentBody,
  isNeedsInfoActive,
  resolveStatusAfterInfoResponse,
} from "@/lib/portal-info-response";
import { createAdminNotification } from "@/lib/admin-notifications";

const PORTAL_VALIDATION_ERROR =
  "Please shorten your input or fix the required fields and try again.";
const PORTAL_RATE_LIMIT_ERROR =
  "Too many requests right now. Please wait a few minutes and try again.";

function revalidateAdminAttentionPaths(requestId: string) {
  revalidatePath("/admin");
  revalidatePath("/admin/requests");
  revalidatePath(`/admin/requests/${requestId}`);
}

export async function getPortalSubmitOptions(clientId: string) {
  const session = await auth();
  if (!session?.user) {
    return { error: "Unauthorized." as const };
  }

  const setup = await getClientPortalSupportSetupForSession(clientId, session);
  if ("error" in setup) {
    return setup;
  }

  return {
    engagementType: setup.engagementType,
    isRequestBased: setup.isRequestBased,
    isSupportBlock: setup.isSupportBlock,
    categories: setup.categories,
    canSubmit: setup.canSubmit,
    blockMessage: setup.blockMessage,
    blockReasonCode: setup.blockReasonCode,
  };
}

export async function requestScopeChange(data: {
  note: string;
  requestedWorkTaskIds?: string[];
}) {
  const session = await requireClientUser("portal.work");
  const clientId = session.user.clientId!;

  const parsed = requestScopeChangeSchema.safeParse(data);
  if (!parsed.success) {
    return { error: PORTAL_VALIDATION_ERROR };
  }

  const scopeLimit = await checkRateLimit("portal-scope-change", `user:${session.user.id}`);
  if (!scopeLimit.allowed) {
    return { error: PORTAL_RATE_LIMIT_ERROR };
  }

  const client = await prisma.client.findUnique({
    where: { id: clientId },
    select: { status: true, companyName: true, contactName: true, email: true, phone: true, planType: true },
  });

  if (!client) {
    return { error: "Client not found." };
  }

  if (!canRequestScopeChange(client)) {
    return { error: "Your account is being activated by Hargen." };
  }

  let resolvedTaskNames: string[] = [];
  if (parsed.data.requestedWorkTaskIds && parsed.data.requestedWorkTaskIds.length > 0) {
    const taskValidation = await validateRequestedDiscoveryTaskIds(
      parsed.data.requestedWorkTaskIds,
    );
    if (!taskValidation.ok) {
      return { error: taskValidation.error };
    }
    resolvedTaskNames = taskValidation.tasks.map((task) => task.name);
  }

  const supportNeeded =
    resolvedTaskNames.length > 0 ? resolvedTaskNames.join(", ") : "Scope change request";

  try {
    const supportRequest = await prisma.supportRequest.create({
      data: {
        clientId,
        title: "Scope change request",
        kind: SupportRequestKind.CLIENT_OPS,
        source: SupportRequestSource.PORTAL,
        supportNeeded,
        description: parsed.data.note,
        metadata: {
          type: "scope_change",
          requestedWorkTaskIds: parsed.data.requestedWorkTaskIds ?? [],
          requestedTaskNames: resolvedTaskNames,
        },
        urgency: Urgency.NORMAL,
        status: RequestStatus.NEW,
      },
    });

    try {
      await sendInternalRequestAlert({
        companyName: client.companyName,
        contactName: client.contactName,
        email: client.email,
        phone: client.phone,
        supportNeeded,
        plan: client.planType,
        urgency: Urgency.NORMAL,
        description: parsed.data.note,
        requestId: supportRequest.id,
        clientId,
        kind: SupportRequestKind.CLIENT_OPS,
        subjectPrefix: "[Scope change]",
      });
    } catch (emailError) {
      console.error("Failed to send scope change alert:", emailError);
    }

    revalidatePath("/portal");
    revalidatePath("/portal/account");
    revalidatePath("/admin/requests");

    return { success: true, requestId: supportRequest.id };
  } catch (error) {
    console.error("Error submitting scope change request:", error);
    return { error: "Failed to submit scope change request." };
  }
}

export async function submitPortalRequest(data: {
  title: string;
  workTaskId?: string;
  supportNeeded: string;
  description: string;
  urgency: string;
  customerName?: string;
  utilityAhj?: string;
  toolsContext?: string;
  desiredOutcome?: string;
  projectUrl?: string;
  metadata?: Record<string, string | number | boolean | null>;
  attachments?: Array<{ url: string; name: string; type: string; size: number }>;
}) {
  const session = await requireClientUser("portal.work");
  const clientId = session.user.clientId!;

  const parsed = createPortalSubmitRequestSchema(clientId).safeParse({
    title: data.title,
    workTaskId: data.workTaskId,
    supportNeeded: data.supportNeeded,
    description: data.description,
    urgency: data.urgency,
    customerName: data.customerName,
    utilityAhj: data.utilityAhj,
    toolsContext: data.toolsContext,
    desiredOutcome: data.desiredOutcome,
    projectUrl: data.projectUrl,
    metadata: data.metadata,
    attachments: data.attachments,
  });

  if (!parsed.success) {
    return { error: PORTAL_VALIDATION_ERROR };
  }

  const submitLimit = await checkRateLimit(
    "portal-request-submit",
    `user:${session.user.id}`,
  );
  if (!submitLimit.allowed) {
    return { error: PORTAL_RATE_LIMIT_ERROR };
  }

  const {
    title,
    workTaskId,
    description,
    urgency,
    customerName,
    utilityAhj,
    toolsContext,
    desiredOutcome,
    projectUrl,
    metadata,
    attachments,
  } = parsed.data;

  const urgencyEnum = urgency as Urgency;

  try {
    const submitGate = await checkPortalWorkSubmit(clientId, {
      entryPoint: "portal_submit",
      actorId: session.user.id,
      workTaskId,
    });
    if (!submitGate.ok) {
      return { error: submitGate.error };
    }

    if (!workTaskId) {
      return { error: "Please select a work type." };
    }

    const catalogClient = await loadClientCatalogContext(clientId);
    if (!catalogClient) {
      return { error: "Client record not found." };
    }

    const taskGate = await checkClientWorkTaskSubmit({
      clientId,
      client: catalogClient,
      workTaskId,
      options: {
        entryPoint: "portal_submit",
        actorId: session.user.id,
        workTaskId,
      },
    });
    if (!taskGate.ok) {
      return { error: taskGate.error };
    }

    const resolvedSupportNeeded = taskGate.workTask.name;

    let fullDescription = description;

    // Append legacy metadata if present
    if (customerName || utilityAhj || toolsContext || desiredOutcome) {
      fullDescription += `

---
Customer/Job: ${customerName || "N/A"}
Utility/AHJ: ${utilityAhj || "N/A"}
Tools/Context: ${toolsContext || "N/A"}
Desired Outcome: ${desiredOutcome || "N/A"}`;
    }

    // Append new metadata if present
    if (metadata && Object.keys(metadata).length > 0) {
      const metadataEntries = Object.entries(metadata)
        .filter(([, value]) => value !== undefined && value !== null && value !== "")
        .map(([key, value]) => {
          // Format key: replace camelCase or snake_case with Title Case for better readability
          const formattedKey = key
            .replace(/([A-Z])/g, " $1")
            .replace(/[_-]/g, " ")
            .replace(/^\w/, (c) => c.toUpperCase());
          
          return `${formattedKey}: ${value}`;
        });

      if (metadataEntries.length > 0) {
        fullDescription += `

---
Service Details:
${metadataEntries.join("\n")}`;
      }
    }

    const supportRequest = await prisma.supportRequest.create({
      data: {
        clientId,
        workTaskId,
        title,
        kind: SupportRequestKind.CLIENT_OPS,
        source: SupportRequestSource.PORTAL,
        supportNeeded: resolvedSupportNeeded,
        description: fullDescription,
        metadata: metadata || undefined,
        projectUrl,
        urgency: urgencyEnum,
        status: RequestStatus.NEW,
        attachments: attachments?.length
          ? {
              create: attachments.map((file) => ({
                clientId,
                fileName: file.name,
                fileUrl: file.url,
                fileType: file.type,
              })),
            }
          : undefined,
      },
    });

    const clientProfile = await prisma.client.findUnique({
      where: { id: clientId },
      select: {
        companyName: true,
        contactName: true,
        email: true,
        phone: true,
        planType: true,
      },
    });

    try {
      await sendInternalRequestAlert({
        companyName: clientProfile?.companyName ?? "Unknown",
        contactName: clientProfile?.contactName ?? "Unknown",
        email: clientProfile?.email ?? "",
        phone: clientProfile?.phone ?? null,
        supportNeeded: resolvedSupportNeeded,
        plan: clientProfile?.planType,
        urgency: urgencyEnum,
        description: fullDescription,
        requestId: supportRequest.id,
        kind: SupportRequestKind.CLIENT_OPS,
      });
    } catch (emailError) {
      console.error("Failed to send internal alert for portal request:", emailError);
    }

    revalidatePath("/portal");
    revalidatePath("/portal/requests");

    return { success: true, requestId: supportRequest.id };
  } catch (error) {
    console.error("Error submitting portal request:", error);
    return { error: "Failed to submit request. Please try again." };
  }
}

export async function addRequestComment(data: {
  requestId: string;
  body: string;
  isInternal?: boolean;
}) {
  const session = await auth();
  if (!session?.user) return { error: "Unauthorized." };

  const parsed = portalAddCommentSchema.safeParse({
    requestId: data.requestId,
    body: data.body,
  });

  if (!parsed.success) {
    return { error: PORTAL_VALIDATION_ERROR };
  }

  const isAdmin = session.user.role === "ADMIN";
  const clientId = session.user.clientId;

  if (!isAdmin) {
    await requireClientUser("portal.work");
  }

  if (!isAdmin) {
    const commentLimit = await checkRateLimit(
      "portal-comment",
      `user:${session.user.id}`,
    );
    if (!commentLimit.allowed) {
      return { error: PORTAL_RATE_LIMIT_ERROR };
    }
  }

  const { requestId, body } = parsed.data;

  try {
    const request = await prisma.supportRequest.findUnique({
      where: { id: requestId },
      include: { client: true },
    });

    if (!request) {
      return { error: "Request not found." };
    }

    if (!isAdmin && request.clientId !== clientId) {
      return { error: "Unauthorized. You do not have access to this request." };
    }

    if (!isAdmin && isNeedsInfoActive(request)) {
      return {
        error: "Please use the Provide Information form to respond to this request.",
      };
    }

    const comment = await prisma.requestComment.create({
      data: {
        supportRequestId: requestId,
        authorUserId: session.user.id,
        authorType: isAdmin ? AuthorType.ADMIN : AuthorType.CLIENT,
        body,
        isInternal: isAdmin ? (data.isInternal || false) : false,
      },
    });

    if (!isAdmin) {
      try {
        await createAdminNotification({
          type: AdminNotificationType.CLIENT_COMMENT,
          supportRequestId: requestId,
          clientId: request.clientId,
          title: request.title,
          summary: body,
        });
      } catch (notificationError) {
        console.error("Failed to create admin notification:", notificationError);
      }

      try {
        await sendInternalClientCommentAlert({
          companyName: request.client.companyName,
          requestTitle: request.title,
          requestId,
          commentBody: body,
        });
      } catch (emailError) {
        console.error("Failed to send client comment alert:", emailError);
      }
    }

    revalidatePath(`/portal/requests/${requestId}`);
    revalidateAdminAttentionPaths(requestId);

    return { success: true, comment };
  } catch (error) {
    console.error("Error adding comment:", error);
    return { error: "Failed to add comment." };
  }
}

export async function submitInfoResponse(data: {
  requestId: string;
  body?: string;
  attachments?: Array<{ url: string; name: string; type: string; size?: number }>;
}) {
  const session = await auth();
  if (!session?.user) return { error: "Unauthorized." };

  await requireClientUser("portal.work");

  const clientId = session.user.clientId;
  if (!clientId) return { error: "Unauthorized." };

  const parsed = createPortalSubmitInfoResponseSchema(clientId).safeParse(data);
  if (!parsed.success) {
    return { error: PORTAL_VALIDATION_ERROR };
  }

  const commentLimit = await checkRateLimit(
    "portal-comment",
    `user:${session.user.id}`,
  );
  if (!commentLimit.allowed) {
    return { error: PORTAL_RATE_LIMIT_ERROR };
  }

  const { requestId, body, attachments } = parsed.data;

  try {
    const request = await prisma.supportRequest.findUnique({
      where: { id: requestId },
      include: { client: true },
    });

    if (!request || request.clientId !== clientId) {
      return { error: "Request not found." };
    }

    if (!isNeedsInfoActive(request)) {
      return { error: "This request no longer needs information." };
    }

    const fileNames = attachments?.map((file) => file.name) ?? [];
    const commentBody = buildInfoResponseCommentBody(body, fileNames);
    const statusAfter = resolveStatusAfterInfoResponse(request.status);

    await prisma.$transaction(async (tx) => {
      const current = await tx.supportRequest.findUnique({
        where: { id: requestId },
      });

      if (!current || !isNeedsInfoActive(current)) {
        throw new Error("NEEDS_INFO_STALE");
      }

      await tx.requestComment.create({
        data: {
          supportRequestId: requestId,
          authorUserId: session.user!.id,
          authorType: AuthorType.CLIENT,
          body: commentBody,
          isInternal: false,
        },
      });

      if (attachments?.length) {
        await tx.attachment.createMany({
          data: attachments.map((file) => ({
            clientId,
            supportRequestId: requestId,
            fileName: file.name,
            fileUrl: file.url,
            fileType: file.type,
            uploadedById: session.user!.id,
          })),
        });
      }

      await tx.supportRequest.update({
        where: { id: requestId },
        data: {
          needsInfo: false,
          ...(statusAfter !== current.status ? { status: statusAfter } : {}),
        },
      });
    });

    if (statusAfter !== request.status) {
      await writeAuditLog({
        actorUserId: session.user.id,
        action: "request.info_response",
        entityType: "SupportRequest",
        entityId: requestId,
        metadata: {
          statusBefore: request.status,
          statusAfter,
          attachmentCount: attachments?.length ?? 0,
        },
      });
    }

    try {
      await createAdminNotification({
        type: AdminNotificationType.CLIENT_INFO_RESPONSE,
        supportRequestId: requestId,
        clientId: request.clientId,
        title: request.title,
        summary: commentBody,
        attachmentCount: attachments?.length ?? 0,
      });
    } catch (notificationError) {
      console.error("Failed to create admin notification:", notificationError);
    }

    try {
      await sendInternalClientCommentAlert({
        companyName: request.client.companyName,
        requestTitle: request.title,
        requestId,
        commentBody,
        isInfoResponse: true,
        attachmentNames: fileNames,
      });
    } catch (emailError) {
      console.error("Failed to send info response alert:", emailError);
    }

    revalidatePath("/portal");
    revalidatePath("/portal/requests");
    revalidatePath(`/portal/requests/${requestId}`);
    revalidateAdminAttentionPaths(requestId);

    return { success: true };
  } catch (error) {
    if (error instanceof Error && error.message === "NEEDS_INFO_STALE") {
      return { error: "This request no longer needs information." };
    }
    console.error("Error submitting info response:", error);
    return { error: "Failed to submit your response. Please try again." };
  }
}
