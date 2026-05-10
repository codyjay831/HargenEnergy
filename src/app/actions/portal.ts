"use server";

import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { RequestStatus, Urgency, AuthorType } from "@/generated/prisma/client";
import { revalidatePath } from "next/cache";
import { sendInternalRequestAlert } from "@/lib/email";
import {
  portalSubmitRequestSchema,
  portalAddCommentSchema,
} from "@/lib/validations";
import { checkRateLimit } from "@/lib/rate-limit";

const PORTAL_VALIDATION_ERROR =
  "Please shorten your input or fix the required fields and try again.";
const PORTAL_RATE_LIMIT_ERROR =
  "Too many requests right now. Please wait a few minutes and try again.";

export async function submitPortalRequest(data: {
  title: string;
  supportNeeded: string;
  description: string;
  urgency: string;
  customerName?: string;
  utilityAhj?: string;
  toolsContext?: string;
  desiredOutcome?: string;
}) {
  const session = await auth();
  const clientId = session?.user?.clientId;

  if (!session?.user || !clientId) {
    return { error: "Unauthorized. Client access required." };
  }

  const parsed = portalSubmitRequestSchema.safeParse({
    title: data.title,
    supportNeeded: data.supportNeeded,
    description: data.description,
    urgency: data.urgency,
    customerName: data.customerName,
    utilityAhj: data.utilityAhj,
    toolsContext: data.toolsContext,
    desiredOutcome: data.desiredOutcome,
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
    supportNeeded,
    description,
    urgency,
    customerName,
    utilityAhj,
    toolsContext,
    desiredOutcome,
  } = parsed.data;

  const urgencyEnum = urgency as Urgency;

  try {
    const client = await prisma.client.findUnique({
      where: { id: clientId },
    });

    if (!client) {
      return { error: "Client record not found." };
    }

    const fullDescription = `
${description}

---
Customer/Job: ${customerName || "N/A"}
Utility/AHJ: ${utilityAhj || "N/A"}
Tools/Context: ${toolsContext || "N/A"}
Desired Outcome: ${desiredOutcome || "N/A"}
    `.trim();

    const supportRequest = await prisma.supportRequest.create({
      data: {
        clientId,
        title,
        supportNeeded,
        description: fullDescription,
        urgency: urgencyEnum,
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
        urgency: urgencyEnum,
        description: fullDescription,
        requestId: supportRequest.id,
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
      console.log(
        `Client ${request.client.companyName} commented on request ${request.title}`,
      );
    }

    revalidatePath(`/portal/requests/${requestId}`);
    revalidatePath(`/admin/requests/${requestId}`);

    return { success: true, comment };
  } catch (error) {
    console.error("Error adding comment:", error);
    return { error: "Failed to add comment." };
  }
}
