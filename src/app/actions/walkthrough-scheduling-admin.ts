"use server";

import {
  RequestStatus,
  WalkthroughFitDecision,
  WalkthroughSchedulingLinkStatus,
} from "@/generated/prisma/client";
import { requireStaff } from "@/lib/auth-guards";
import { writeAuditLog } from "@/lib/audit-log";
import { prisma } from "@/lib/prisma";
import { revalidateAdminClientPage } from "@/lib/revalidate-paths";
import {
  sendWalkthroughNeedsInfoEmail,
  sendWalkthroughRecapEmail,
  sendWalkthroughSchedulingLinkEmail,
} from "@/lib/email";
import { canTransitionQualificationStatus } from "@/lib/sales/lifecycle";
import { getWalkthroughSchedulingReadiness } from "@/lib/walkthrough-scheduling/scheduling-readiness";
import { encryptFieldValue, decryptFieldValue } from "@/lib/crypto/field-encryption";
import {
  buildSchedulingLinkExpiry,
  buildWalkthroughSchedulingUrl,
  createSchedulingRawToken,
  hashSchedulingToken,
} from "@/lib/walkthrough-scheduling/tokens";
import { ensureWalkthroughAvailabilitySettings } from "@/lib/walkthrough-scheduling/availability-settings";
import type { WeekdayWindows } from "@/lib/walkthrough-scheduling/types";
import { revalidatePath } from "next/cache";

async function getIntakeRequest(supportRequestId: string) {
  return prisma.supportRequest.findFirst({
    where: { id: supportRequestId, kind: "PROSPECT_INTAKE" },
    include: { client: true },
  });
}

export async function qualifyWalkthroughRequest(
  supportRequestId: string,
  internalNotes?: string,
) {
  await requireStaff();
  const request = await getIntakeRequest(supportRequestId);
  if (!request) return { error: "Walkthrough request not found." };

  if (!canTransitionQualificationStatus(request.status, RequestStatus.REVIEWED)) {
    return { error: "Invalid status transition." };
  }

  await prisma.supportRequest.update({
    where: { id: request.id },
    data: {
      status: RequestStatus.REVIEWED,
      needsInfo: false,
      internalNotes: internalNotes?.trim() || request.internalNotes,
    },
  });

  revalidateAdminClientPage(request.clientId);
  return { success: true };
}

const NEEDS_INFO_MESSAGE_MIN = 10;
const NEEDS_INFO_MESSAGE_MAX = 5000;

export async function markWalkthroughNeedsInfo(supportRequestId: string, message: string) {
  const session = await requireStaff();
  const request = await getIntakeRequest(supportRequestId);
  if (!request) return { error: "Walkthrough request not found." };

  const trimmedMessage = message.trim();
  if (trimmedMessage.length < NEEDS_INFO_MESSAGE_MIN) {
    return { error: "Please enter at least 10 characters describing what you need." };
  }
  if (trimmedMessage.length > NEEDS_INFO_MESSAGE_MAX) {
    return { error: "Message is too long. Please keep it under 5000 characters." };
  }

  if (!request.client.email?.trim()) {
    return { error: "Prospect email is missing. Cannot send request." };
  }

  const isResend = request.status === RequestStatus.NEEDS_INFO;
  if (
    !isResend &&
    !canTransitionQualificationStatus(request.status, RequestStatus.NEEDS_INFO)
  ) {
    return { error: "Invalid status transition." };
  }

  const replyTo =
    session.user.email?.trim() || process.env.SUPPORT_NOTIFICATION_EMAIL?.trim();
  if (!replyTo) {
    console.warn(
      "[markWalkthroughNeedsInfo] No staff email or SUPPORT_NOTIFICATION_EMAIL for reply-to.",
    );
    return { error: "Cannot send email: no reply-to address configured." };
  }

  await prisma.supportRequest.update({
    where: { id: request.id },
    data: {
      status: RequestStatus.NEEDS_INFO,
      needsInfo: true,
      clientVisibleUpdate: trimmedMessage,
    },
  });

  const emailResult = await sendWalkthroughNeedsInfoEmail({
    to: request.client.email,
    contactName: request.client.contactName,
    companyName: request.client.companyName,
    message: trimmedMessage,
    replyTo,
  });

  await writeAuditLog({
    actorUserId: session.user.id!,
    action: "walkthrough.needs_info.sent",
    entityType: "SupportRequest",
    entityId: request.id,
    metadata: { clientId: request.clientId, resend: isResend },
  });

  revalidateAdminClientPage(request.clientId);

  if ("error" in emailResult && emailResult.error) {
    return { success: true, warning: emailResult.error };
  }

  return { success: true };
}

export async function markWalkthroughNotAFit(supportRequestId: string, reason?: string) {
  await requireStaff();
  const request = await getIntakeRequest(supportRequestId);
  if (!request) return { error: "Walkthrough request not found." };

  await prisma.supportRequest.update({
    where: { id: request.id },
    data: {
      status: RequestStatus.CANCELLED,
      internalNotes: reason?.trim() || request.internalNotes,
    },
  });

  revalidateAdminClientPage(request.clientId);
  return { success: true };
}

async function createOrRefreshSchedulingLink(
  supportRequestId: string,
  regenerate: boolean,
) {
  const session = await requireStaff();
  const readiness = await getWalkthroughSchedulingReadiness();
  if (!readiness.ready) {
    return { error: readiness.blockers[0] ?? "Scheduling is not ready." };
  }

  const request = await getIntakeRequest(supportRequestId);
  if (!request) return { error: "Walkthrough request not found." };
  if (request.status === RequestStatus.NEW) {
    return { error: "Review and qualify this request before sending a scheduling link." };
  }

  if (regenerate) {
    await prisma.walkthroughSchedulingLink.updateMany({
      where: {
        supportRequestId: request.id,
        status: WalkthroughSchedulingLinkStatus.ACTIVE,
      },
      data: {
        status: WalkthroughSchedulingLinkStatus.REVOKED,
        revokedAt: new Date(),
      },
    });
  }

  const existing = await prisma.walkthroughSchedulingLink.findUnique({
    where: { supportRequestId: request.id },
  });

  if (existing && existing.status === WalkthroughSchedulingLinkStatus.ACTIVE && !regenerate) {
    return { error: "An active scheduling link already exists. Resend or regenerate it." };
  }

  const rawToken = createSchedulingRawToken();
  const link = await prisma.walkthroughSchedulingLink.create({
    data: {
      tokenHash: hashSchedulingToken(rawToken),
      encryptedToken: encryptFieldValue(rawToken),
      clientId: request.clientId,
      supportRequestId: request.id,
      expiresAt: buildSchedulingLinkExpiry(),
      createdByUserId: session.user.id,
    },
  });

  const schedulingUrl = buildWalkthroughSchedulingUrl(rawToken);
  const emailResult = await sendWalkthroughSchedulingLinkEmail({
    to: request.client.email,
    contactName: request.client.contactName,
    companyName: request.client.companyName,
    schedulingUrl,
  });

  await prisma.walkthroughSchedulingLink.update({
    where: { id: link.id },
    data: { sentAt: new Date() },
  });

  await writeAuditLog({
    actorUserId: session.user.id,
    action: regenerate
      ? "walkthrough.scheduling_link.regenerated"
      : "walkthrough.scheduling_link.sent",
    entityType: "WalkthroughSchedulingLink",
    entityId: link.id,
    metadata: { clientId: request.clientId },
  });

  revalidateAdminClientPage(request.clientId);

  if ("error" in emailResult && emailResult.error) {
    return { success: true, warning: emailResult.error, schedulingUrl };
  }

  return { success: true, schedulingUrl };
}

export async function sendWalkthroughSchedulingLink(supportRequestId: string) {
  return createOrRefreshSchedulingLink(supportRequestId, false);
}

export async function regenerateWalkthroughSchedulingLink(supportRequestId: string) {
  return createOrRefreshSchedulingLink(supportRequestId, true);
}

export async function resendWalkthroughSchedulingLink(supportRequestId: string) {
  await requireStaff();
  const request = await getIntakeRequest(supportRequestId);
  if (!request) return { error: "Walkthrough request not found." };

  const link = await prisma.walkthroughSchedulingLink.findUnique({
    where: { supportRequestId: request.id },
  });
  if (!link || link.status !== WalkthroughSchedulingLinkStatus.ACTIVE) {
    return { error: "No active scheduling link to resend." };
  }

  const rawToken = decryptFieldValue(link.encryptedToken);
  if (!rawToken) {
    return { error: "Cannot resend this link. Regenerate a fresh link instead." };
  }

  const schedulingUrl = buildWalkthroughSchedulingUrl(rawToken);
  const emailResult = await sendWalkthroughSchedulingLinkEmail({
    to: request.client.email,
    contactName: request.client.contactName,
    companyName: request.client.companyName,
    schedulingUrl,
  });

  await prisma.walkthroughSchedulingLink.update({
    where: { id: link.id },
    data: { sentAt: new Date() },
  });

  revalidateAdminClientPage(request.clientId);

  if ("error" in emailResult && emailResult.error) {
    return { success: true, warning: emailResult.error, schedulingUrl };
  }
  return { success: true, schedulingUrl };
}

export async function getWalkthroughSchedulingLinkUrl(supportRequestId: string) {
  await requireStaff();
  const link = await prisma.walkthroughSchedulingLink.findUnique({
    where: { supportRequestId },
  });
  if (!link || link.status !== WalkthroughSchedulingLinkStatus.ACTIVE) {
    return { error: "No active scheduling link." };
  }
  const rawToken = decryptFieldValue(link.encryptedToken);
  if (!rawToken) {
    return { error: "Link URL unavailable. Regenerate the link." };
  }
  return { schedulingUrl: buildWalkthroughSchedulingUrl(rawToken) };
}

export async function revokeWalkthroughSchedulingLink(supportRequestId: string) {
  const session = await requireStaff();
  const request = await getIntakeRequest(supportRequestId);
  if (!request) return { error: "Walkthrough request not found." };

  await prisma.walkthroughSchedulingLink.updateMany({
    where: {
      supportRequestId: request.id,
      status: WalkthroughSchedulingLinkStatus.ACTIVE,
    },
    data: {
      status: WalkthroughSchedulingLinkStatus.REVOKED,
      revokedAt: new Date(),
    },
  });

  await writeAuditLog({
    actorUserId: session.user.id,
    action: "walkthrough.scheduling_link.revoked",
    entityType: "WalkthroughSchedulingLink",
    entityId: request.id,
  });

  revalidateAdminClientPage(request.clientId);
  return { success: true };
}

export async function saveWalkthroughDiscoveryNotes(
  appointmentId: string,
  discoveryNotes: string,
) {
  await requireStaff();
  await prisma.walkthroughAppointment.update({
    where: { id: appointmentId },
    data: { discoveryNotes: discoveryNotes.trim() || null },
  });
  return { success: true };
}

export async function saveWalkthroughFitDecision(
  appointmentId: string,
  fitDecision: WalkthroughFitDecision,
  fitDecisionReason?: string,
) {
  await requireStaff();
  const appointment = await prisma.walkthroughAppointment.update({
    where: { id: appointmentId },
    data: {
      fitDecision,
      fitDecisionReason: fitDecisionReason?.trim() || null,
    },
  });
  revalidateAdminClientPage(appointment.clientId);
  return { success: true };
}

export async function saveWalkthroughRecap(appointmentId: string, recapContent: string) {
  await requireStaff();
  const appointment = await prisma.walkthroughAppointment.update({
    where: { id: appointmentId },
    data: { recapContent: recapContent.trim() },
  });
  revalidateAdminClientPage(appointment.clientId);
  return { success: true };
}

export async function sendWalkthroughRecap(appointmentId: string) {
  const session = await requireStaff();
  const appointment = await prisma.walkthroughAppointment.findUnique({
    where: { id: appointmentId },
    include: { client: true },
  });
  if (!appointment?.recapContent) {
    return { error: "Add recap content before sending." };
  }

  const emailResult = await sendWalkthroughRecapEmail({
    to: appointment.customerEmail,
    contactName: appointment.customerContactName,
    companyName: appointment.client.companyName,
    recapContent: appointment.recapContent,
  });

  await prisma.walkthroughAppointment.update({
    where: { id: appointment.id },
    data: { recapSentAt: new Date() },
  });

  await writeAuditLog({
    actorUserId: session.user.id,
    action: "walkthrough.recap.sent",
    entityType: "WalkthroughAppointment",
    entityId: appointment.id,
  });

  revalidateAdminClientPage(appointment.clientId);

  if ("error" in emailResult && emailResult.error) {
    return { success: true, warning: emailResult.error };
  }
  return { success: true };
}

export async function markWalkthroughCompleted(appointmentId: string) {
  await requireStaff();
  const appointment = await prisma.walkthroughAppointment.update({
    where: { id: appointmentId },
    data: { status: "COMPLETED", completedAt: new Date() },
  });
  revalidateAdminClientPage(appointment.clientId);
  return { success: true };
}

export async function markWalkthroughNoShow(appointmentId: string) {
  await requireStaff();
  const appointment = await prisma.walkthroughAppointment.update({
    where: { id: appointmentId },
    data: { status: "NO_SHOW", noShowAt: new Date() },
  });
  revalidateAdminClientPage(appointment.clientId);
  return { success: true };
}

export type WalkthroughAvailabilitySettingsInput = {
  timezone: string;
  slotDurationMinutes: number;
  bufferBeforeMinutes: number;
  bufferAfterMinutes: number;
  minimumNoticeHours: number;
  bookingWindowDays: number;
  weekdayWindows: WeekdayWindows;
  blackoutDates: string[];
  defaultMeetingUrl?: string | null;
  defaultMeetingType?: string;
  smsRemindersEnabled?: boolean;
};

export async function updateWalkthroughAvailabilitySettings(
  input: WalkthroughAvailabilitySettingsInput,
) {
  const session = await requireStaff();
  await ensureWalkthroughAvailabilitySettings();

  await prisma.walkthroughAvailabilitySettings.update({
    where: { id: "default" },
    data: {
      timezone: input.timezone.trim(),
      slotDurationMinutes: input.slotDurationMinutes,
      bufferBeforeMinutes: input.bufferBeforeMinutes,
      bufferAfterMinutes: input.bufferAfterMinutes,
      minimumNoticeHours: input.minimumNoticeHours,
      bookingWindowDays: input.bookingWindowDays,
      weekdayWindows: input.weekdayWindows,
      blackoutDates: input.blackoutDates,
      defaultMeetingUrl: input.defaultMeetingUrl?.trim() || null,
      defaultMeetingType: input.defaultMeetingType?.trim() || "Google Meet",
      smsRemindersEnabled: input.smsRemindersEnabled ?? false,
      updatedByUserId: session.user.id,
    },
  });

  revalidatePath("/admin/settings/walkthrough-availability");
  revalidatePath("/admin/settings/calendar");
  return { success: true };
}

export async function getWalkthroughAvailabilitySettingsForAdmin() {
  await requireStaff();
  const settings = await ensureWalkthroughAvailabilitySettings();
  return settings;
}
