"use server";

import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import {
  RequestStatus,
  Urgency,
  AuthorType,
  SupportRequestKind,
  SupportRequestSource,
} from "@/generated/prisma/client";
import {
  assertWorkTaskAllowedForClient,
  canSubmitPortalWork,
  resolveActiveWorkTask,
} from "@/lib/engagement";
import { assertActiveClientForPortalSubmit } from "@/lib/request-lifecycle";
import {
  getClientPortalSupportSetup,
} from "@/lib/portal-support";
import { revalidatePath } from "next/cache";
import {
  sendInternalClientCommentAlert,
  sendInternalRequestAlert,
} from "@/lib/email";
import {
  portalSubmitRequestSchema,
  portalAddCommentSchema,
} from "@/lib/validations";
import { checkRateLimit } from "@/lib/rate-limit";

const PORTAL_VALIDATION_ERROR =
  "Please shorten your input or fix the required fields and try again.";
const PORTAL_RATE_LIMIT_ERROR =
  "Too many requests right now. Please wait a few minutes and try again.";

export async function getPortalSubmitOptions(clientId: string) {
  const setup = await getClientPortalSupportSetup(clientId);
  if ("error" in setup) {
    return setup;
  }

  return {
    engagementType: setup.engagementType,
    categories: setup.categories,
    canSubmit: setup.canSubmit,
    blockMessage: setup.blockMessage,
  };
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
  const session = await auth();
  const clientId = session?.user?.clientId;

  if (!session?.user || !clientId) {
    return { error: "Unauthorized. Client access required." };
  }

  const parsed = portalSubmitRequestSchema.safeParse({
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
  } = parsed.data;

  const urgencyEnum = urgency as Urgency;

  try {
    const client = await prisma.client.findUnique({
      where: { id: clientId },
      include: { approvedWorkTasks: { select: { workTaskId: true } } },
    });

    if (!client) {
      return { error: "Client record not found." };
    }

    const activeError = assertActiveClientForPortalSubmit(client.status);
    if (activeError) {
      return activeError;
    }

    const submitCheck = canSubmitPortalWork(client);
    if (!submitCheck.canSubmit) {
      return { error: submitCheck.blockMessage ?? "Cannot submit work yet." };
    }

    if (!workTaskId) {
      return { error: "Please select a work type." };
    }

    const taskResult = await resolveActiveWorkTask(workTaskId, (id) =>
      prisma.workTask.findUnique({ where: { id } }),
    );
    if (!taskResult.ok) {
      return { error: taskResult.error };
    }

    const allowed = assertWorkTaskAllowedForClient({
      client,
      workTaskId,
    });
    if (!allowed.ok) {
      return { error: allowed.error };
    }

    const resolvedSupportNeeded = taskResult.workTask.name;

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
        attachments: data.attachments?.length
          ? {
              create: data.attachments.map((file) => ({
                clientId,
                fileName: file.name,
                fileUrl: file.url,
                fileType: file.type,
              })),
            }
          : undefined,
      },
    });

    try {
      await sendInternalRequestAlert({
        companyName: client.companyName,
        contactName: client.contactName,
        email: client.email,
        phone: client.phone,
        supportNeeded: resolvedSupportNeeded,
        plan: client.planType,
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

  if (!session?.user) {
    return { error: "Unauthorized." };
  }

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
    revalidatePath(`/admin/requests/${requestId}`);

    return { success: true, comment };
  } catch (error) {
    console.error("Error adding comment:", error);
    return { error: "Failed to add comment." };
  }
}
