"use server";

import { prisma } from "@/lib/prisma";
import { requestHelpSchema, RequestHelpInput } from "@/lib/validations";
import {
  PlanType,
  Urgency,
  ClientStatus,
  RequestStatus,
  OverflowStatus,
  SupportRequestKind,
  SupportRequestSource,
} from "@/generated/prisma/client";
import { buildIntakeTitle } from "@/lib/request-lifecycle";
import {
  sendRequestConfirmation,
  sendInternalRequestAlert,
  sendClientUpdateEmail,
  sendOverflowApprovalEmail,
  sendDeferredUpdateEmail,
  sendOverflowApprovedEmail,
} from "@/lib/email";
import { auth } from "@/auth";
import { isOverflowStatusValue, isRequestStatusValue } from "@/lib/ui-enums";
import { checkRateLimit, getRateLimitIdentifier } from "@/lib/rate-limit";

export async function submitRequestHelp(data: RequestHelpInput) {
  const validatedFields = requestHelpSchema.safeParse(data);

  if (!validatedFields.success) {
    return {
      error: "Invalid fields. Please check your input.",
      details: validatedFields.error.flatten().fieldErrors,
    };
  }

  const {
    companyName,
    name,
    role,
    email,
    phone,
    website,
    serviceArea,
    supportNeeded,
    bottleneck,
    plan,
    urgency,
    tools,
    takeOffPlate,
    websiteUrlHoneypot,
  } = validatedFields.data;

  // Honeypot: silently accept so automated tools cannot probe validation vs success.
  if (websiteUrlHoneypot?.trim()) {
    return { success: true };
  }

  const rateId = await getRateLimitIdentifier();
  const intakeLimit = await checkRateLimit("public-intake", rateId);
  if (!intakeLimit.allowed) {
    return {
      error: "Too many submissions from this network. Please try again later.",
    };
  }

  const normalizedEmail = email.trim().toLowerCase();

  try {
    // Match existing lead/client by normalized email only (never companyName alone),
    // so a coincidental company name cannot attach to another tenant.
    let client = await prisma.client.findFirst({
      where: { email: normalizedEmail },
      orderBy: { updatedAt: "desc" },
    });

    if (!client) {
      client = await prisma.client.create({
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
          planType: mapPlanType(plan),
        },
      });
    }

    const supportRequest = await prisma.supportRequest.create({
      data: {
        clientId: client.id,
        title: buildIntakeTitle(supportNeeded),
        kind: SupportRequestKind.PROSPECT_INTAKE,
        source: SupportRequestSource.PUBLIC_FORM,
        supportNeeded: supportNeeded.join(", "),
        description: bottleneck,
        mostHelpful: takeOffPlate,
        urgency: mapUrgency(urgency),
        status: RequestStatus.NEW,
      },
    });

    try {
      await Promise.all([
        sendRequestConfirmation(email, companyName),
        sendInternalRequestAlert({
          companyName,
          contactName: name,
          email,
          phone,
          supportNeeded: supportNeeded.join(", "),
          plan,
          urgency,
          description: bottleneck,
          requestId: supportRequest.id,
          kind: SupportRequestKind.PROSPECT_INTAKE,
        }),
      ]);
    } catch (emailError) {
      console.error("Failed to send intake emails:", emailError);
    }

    return { success: true, requestId: supportRequest.id };
  } catch (error) {
    console.error("Error submitting request:", error);
    return { error: "Something went wrong. Please try again later." };
  }
}

function mapPlanType(plan: string): PlanType {
  switch (plan) {
    case "light":
      return PlanType.LIGHT;
    case "core":
      return PlanType.CORE;
    case "priority":
      return PlanType.PRIORITY;
    default:
      return PlanType.LIGHT;
  }
}

function mapUrgency(urgency: string): Urgency {
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

export async function updateRequest(
  id: string,
  data: {
    status?: RequestStatus;
    needsInfo?: boolean;
    internalNotes?: string | null;
    clientVisibleUpdate?: string | null;
    estimatedMinutes?: number | null;
    overflowStatus?: OverflowStatus;
    overflowReason?: string | null;
    deferredUntil?: Date | null;
    priorityRank?: number | null;
    overflowApprovedAt?: Date | null;
    overflowApprovedById?: string | null;
    sendEmailUpdate?: boolean;
    sendOverflowEmail?: boolean;
    sendDeferredEmail?: boolean;
  },
) {
  const session = await auth();

  if (!session?.user || session.user.role !== "ADMIN") {
    return { error: "Unauthorized. Admin access required." };
  }

  if (data.status !== undefined && !isRequestStatusValue(data.status)) {
    return { error: "Invalid status." };
  }

  if (
    data.overflowStatus !== undefined &&
    !isOverflowStatusValue(data.overflowStatus)
  ) {
    return { error: "Invalid overflow status." };
  }

  const { sendEmailUpdate, sendOverflowEmail, sendDeferredEmail, ...updateData } =
    data;

  if (updateData.overflowStatus === OverflowStatus.APPROVED) {
    updateData.overflowApprovedAt = new Date();
    updateData.overflowApprovedById = session.user.id;
  }

  try {
    const request = await prisma.supportRequest.update({
      where: { id },
      data: updateData,
      include: { client: true },
    });

    const emailPromises = [];

    if (sendEmailUpdate && request.clientVisibleUpdate) {
      emailPromises.push(
        sendClientUpdateEmail({
          to: request.client.email,
          requestTitle: request.title,
          requestId: request.id,
          status: request.status,
          needsInfo: request.needsInfo,
          clientVisibleUpdate: request.clientVisibleUpdate,
          companyName: request.client.companyName,
          logoUrl: request.client.logoUrl,
        }),
      );
    }

    if (sendOverflowEmail) {
      if (request.overflowStatus === OverflowStatus.NEEDS_APPROVAL) {
        emailPromises.push(
          sendOverflowApprovalEmail({
            to: request.client.email,
            requestTitle: request.title,
            overflowReason: request.overflowReason,
            clientVisibleUpdate: request.clientVisibleUpdate,
          }),
        );
      } else if (request.overflowStatus === OverflowStatus.APPROVED) {
        emailPromises.push(
          sendOverflowApprovedEmail({
            to: request.client.email,
            requestTitle: request.title,
            clientVisibleUpdate: request.clientVisibleUpdate,
          }),
        );
      }
    }

    if (sendDeferredEmail && request.overflowStatus === OverflowStatus.DEFERRED) {
      emailPromises.push(
        sendDeferredUpdateEmail({
          to: request.client.email,
          requestTitle: request.title,
          deferredUntil: request.deferredUntil,
          clientVisibleUpdate: request.clientVisibleUpdate,
        }),
      );
    }

    if (emailPromises.length > 0) {
      try {
        await Promise.all(emailPromises);
      } catch (emailError) {
        console.error("Failed to send notification emails:", emailError);
        return {
          success: true,
          request,
          warning: "Update saved, but one or more email notifications failed.",
        };
      }
    }

    return { success: true, request };
  } catch (error) {
    console.error("Error updating request:", error);
    return { error: "Failed to update request." };
  }
}
