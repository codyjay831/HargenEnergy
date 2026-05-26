"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requestHelpSchema, RequestHelpInput, updateRequestHandoffPricingSchema } from "@/lib/validations";
import {
  PricingMode,
  RequestStatus,
  OverflowStatus,
  EngagementType,
} from "@/generated/prisma/client";
import {
  sendRequestConfirmation,
  sendInternalRequestAlert,
  sendClientUpdateEmail,
  sendOverflowApprovalEmail,
  sendDeferredUpdateEmail,
  sendOverflowApprovedEmail,
} from "@/lib/email";
import { auth } from "@/auth";
import { isRequestStatusValue, isOverflowStatusValue } from "@/lib/ui-enums";
import { checkRateLimit, getRateLimitIdentifier } from "@/lib/rate-limit";
import {
  isRequestBasedPricingComplete,
  REQUEST_BASED_PRICING_REQUIRED_ERROR,
} from "@/lib/engagement";
import { persistPublicIntake } from "@/lib/intake-submit";
import { validateRequestedWalkthroughTaskIds } from "@/lib/walkthrough-catalog";
import { writeAuditLog } from "@/lib/audit-log";

export async function submitRequestHelp(data: RequestHelpInput) {
  const validatedFields = requestHelpSchema.safeParse(data);

  if (!validatedFields.success) {
    return {
      error: "Invalid fields. Please check your input.",
      details: validatedFields.error.flatten().fieldErrors,
    };
  }

  const { email, companyName, websiteUrlHoneypot } = validatedFields.data;

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

  const taskValidation = await validateRequestedWalkthroughTaskIds(
    validatedFields.data.requestedWorkTaskIds,
  );
  if (!taskValidation.ok) {
    return {
      error: taskValidation.error,
      details: { requestedWorkTaskIds: [taskValidation.error] },
    };
  }

  try {
    const { clientId, emailPayload } = await persistPublicIntake(prisma, {
      ...validatedFields.data,
      normalizedEmail,
      resolvedTasks: taskValidation.tasks,
    });

    void Promise.all([
      sendRequestConfirmation(email, companyName),
      sendInternalRequestAlert(emailPayload),
    ]).catch((emailError) => {
      console.error("Failed to send intake emails:", emailError);
    });

    revalidatePath("/admin");
    revalidatePath("/admin/clients");
    revalidatePath(`/admin/clients/${clientId}`);

    return { success: true, requestId: emailPayload.requestId };
  } catch (error) {
    console.error("Error submitting request:", error);
    return { error: "Something went wrong. Please try again later." };
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
    const existing = await prisma.supportRequest.findUnique({
      where: { id },
      include: { client: { select: { engagementType: true } } },
    });

    if (!existing) {
      return { error: "Request not found." };
    }

    if (
      updateData.status === RequestStatus.IN_PROGRESS &&
      existing.client.engagementType === EngagementType.REQUEST_BASED
    ) {
      const merged = { ...existing, ...updateData };
      if (!isRequestBasedPricingComplete(merged)) {
        return { error: REQUEST_BASED_PRICING_REQUIRED_ERROR };
      }
    }

    const request = await prisma.supportRequest.update({
      where: { id },
      data: updateData,
      include: { client: true },
    });

    if (
      (data.status !== undefined && data.status !== existing.status) ||
      (data.internalNotes !== undefined && data.internalNotes !== existing.internalNotes)
    ) {
      await writeAuditLog({
        actorUserId: session.user.id,
        action: "request.update",
        entityType: "SupportRequest",
        entityId: request.id,
        metadata: {
          statusBefore: existing.status,
          statusAfter: request.status,
          internalNotesChanged:
            data.internalNotes !== undefined &&
            data.internalNotes !== existing.internalNotes,
        },
      });
    }

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
          clientId: request.clientId,
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

export async function updateRequestHandoffPricing(data: {
  requestId: string;
  handoffTier: string;
  pricingMode: string;
  flatPriceCents?: number | null;
}) {
  const session = await auth();

  if (!session?.user || session.user.role !== "ADMIN") {
    return { error: "Unauthorized. Admin access required." };
  }

  const parsed = updateRequestHandoffPricingSchema.safeParse({
    requestId: data.requestId,
    handoffTier: data.handoffTier,
    pricingMode: data.pricingMode,
    flatPriceCents: data.flatPriceCents ?? null,
  });

  if (!parsed.success) {
    return { error: "Invalid handoff or pricing fields." };
  }

  const { requestId, handoffTier, pricingMode } = parsed.data;
  const flatPriceCents =
    pricingMode === PricingMode.FLAT ? parsed.data.flatPriceCents : null;

  try {
    const request = await prisma.supportRequest.update({
      where: { id: requestId },
      data: {
        handoffTier,
        pricingMode,
        flatPriceCents,
      },
      include: { client: true },
    });

    revalidatePath(`/admin/requests/${requestId}`);
    revalidatePath(`/portal/requests/${requestId}`);
    revalidatePath("/admin/requests");

    return { success: true, request };
  } catch (error) {
    console.error("Error updating handoff/pricing:", error);
    return { error: "Failed to update handoff and pricing." };
  }
}

export async function updateRequestPriority(id: string, priorityRank: number | null) {
  const session = await auth();

  if (!session?.user || session.user.role !== "ADMIN") {
    return { error: "Unauthorized. Admin access required." };
  }

  try {
    const request = await prisma.supportRequest.update({
      where: { id },
      data: { priorityRank },
    });

    return { success: true, request };
  } catch (error) {
    console.error("Error updating request priority:", error);
    return { error: "Failed to update request priority." };
  }
}
