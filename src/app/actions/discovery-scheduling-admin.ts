"use server";

import {
  RequestStatus,
  DiscoveryFitDecision,
  DiscoverySchedulingLinkStatus,
} from "@/generated/prisma/client";
import { requireStaff } from "@/lib/auth-guards";
import { writeAuditLog } from "@/lib/audit-log";
import { prisma } from "@/lib/prisma";
import { revalidateAdminClientPage } from "@/lib/revalidate-paths";
import {
  sendDiscoveryNeedsInfoEmail,
  sendDiscoveryRecapEmail,
  sendDiscoverySchedulingLinkEmail,
} from "@/lib/email";
import { canTransitionQualificationStatus } from "@/lib/sales/lifecycle";
import { ensureDiscoverySchedulingLink } from "@/lib/discovery-scheduling/ensure-scheduling-link";
import { decryptFieldValue } from "@/lib/crypto/field-encryption";
import { buildDiscoverySchedulingUrl } from "@/lib/discovery-scheduling/tokens";
import { ensureDiscoveryAvailabilitySettings } from "@/lib/discovery-scheduling/availability-settings";
import type { WeekdayWindows } from "@/lib/discovery-scheduling/types";
import { revalidatePath } from "next/cache";

async function getIntakeRequest(supportRequestId: string) {
  return prisma.supportRequest.findFirst({
    where: { id: supportRequestId, kind: "PROSPECT_INTAKE" },
    include: { client: true },
  });
}

export async function qualifyDiscoveryRequest(
  supportRequestId: string,
  internalNotes?: string,
) {
  await requireStaff();
  const request = await getIntakeRequest(supportRequestId);
  if (!request) return { error: "Discovery request not found." };

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

export async function markDiscoveryNeedsInfo(supportRequestId: string, message: string) {
  const session = await requireStaff();
  const request = await getIntakeRequest(supportRequestId);
  if (!request) return { error: "Discovery request not found." };

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
      "[markDiscoveryNeedsInfo] No staff email or SUPPORT_NOTIFICATION_EMAIL for reply-to.",
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

  const emailResult = await sendDiscoveryNeedsInfoEmail({
    to: request.client.email,
    contactName: request.client.contactName,
    companyName: request.client.companyName,
    message: trimmedMessage,
    replyTo,
  });

  await writeAuditLog({
    actorUserId: session.user.id!,
    action: "discovery.needs_info.sent",
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

export async function markDiscoveryNotAFit(supportRequestId: string, reason?: string) {
  await requireStaff();
  const request = await getIntakeRequest(supportRequestId);
  if (!request) return { error: "Discovery request not found." };

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
  const result = await ensureDiscoverySchedulingLink({
    supportRequestId,
    regenerate,
    sendSchedulingEmail: true,
    createdByUserId: session.user.id,
    audit: {
      actorUserId: session.user.id,
      action: regenerate
        ? "discovery.scheduling_link.regenerated"
        : "discovery.scheduling_link.sent",
    },
  });

  if ("error" in result) {
    return { error: result.error };
  }

  if (result.warning) {
    return { success: true, warning: result.warning, schedulingUrl: result.schedulingUrl };
  }

  return { success: true, schedulingUrl: result.schedulingUrl };
}

export async function sendDiscoverySchedulingLink(supportRequestId: string) {
  return createOrRefreshSchedulingLink(supportRequestId, false);
}

export async function regenerateDiscoverySchedulingLink(supportRequestId: string) {
  return createOrRefreshSchedulingLink(supportRequestId, true);
}

export async function resendDiscoverySchedulingLink(supportRequestId: string) {
  await requireStaff();
  const request = await getIntakeRequest(supportRequestId);
  if (!request) return { error: "Discovery request not found." };

  const link = await prisma.discoverySchedulingLink.findUnique({
    where: { supportRequestId: request.id },
  });
  if (!link || link.status !== DiscoverySchedulingLinkStatus.ACTIVE) {
    return { error: "No active scheduling link to resend." };
  }

  const rawToken = decryptFieldValue(link.encryptedToken);
  if (!rawToken) {
    return { error: "Cannot resend this link. Regenerate a fresh link instead." };
  }

  const schedulingUrl = buildDiscoverySchedulingUrl(rawToken);
  const emailResult = await sendDiscoverySchedulingLinkEmail({
    to: request.client.email,
    contactName: request.client.contactName,
    companyName: request.client.companyName,
    schedulingUrl,
  });

  await prisma.discoverySchedulingLink.update({
    where: { id: link.id },
    data: { sentAt: new Date() },
  });

  revalidateAdminClientPage(request.clientId);

  if ("error" in emailResult && emailResult.error) {
    return { success: true, warning: emailResult.error, schedulingUrl };
  }
  return { success: true, schedulingUrl };
}

export async function getDiscoverySchedulingLinkUrl(supportRequestId: string) {
  await requireStaff();
  const link = await prisma.discoverySchedulingLink.findUnique({
    where: { supportRequestId },
  });
  if (!link || link.status !== DiscoverySchedulingLinkStatus.ACTIVE) {
    return { error: "No active scheduling link." };
  }
  const rawToken = decryptFieldValue(link.encryptedToken);
  if (!rawToken) {
    return { error: "Link URL unavailable. Regenerate the link." };
  }
  return { schedulingUrl: buildDiscoverySchedulingUrl(rawToken) };
}

export async function revokeDiscoverySchedulingLink(supportRequestId: string) {
  const session = await requireStaff();
  const request = await getIntakeRequest(supportRequestId);
  if (!request) return { error: "Discovery request not found." };

  await prisma.discoverySchedulingLink.updateMany({
    where: {
      supportRequestId: request.id,
      status: DiscoverySchedulingLinkStatus.ACTIVE,
    },
    data: {
      status: DiscoverySchedulingLinkStatus.REVOKED,
      revokedAt: new Date(),
    },
  });

  await writeAuditLog({
    actorUserId: session.user.id,
    action: "discovery.scheduling_link.revoked",
    entityType: "DiscoverySchedulingLink",
    entityId: request.id,
  });

  revalidateAdminClientPage(request.clientId);
  return { success: true };
}

export async function saveDiscoveryDiscoveryNotes(
  appointmentId: string,
  discoveryNotes: string,
) {
  await requireStaff();
  await prisma.discoveryAppointment.update({
    where: { id: appointmentId },
    data: { discoveryNotes: discoveryNotes.trim() || null },
  });
  return { success: true };
}

export async function saveDiscoveryFitDecision(
  appointmentId: string,
  fitDecision: DiscoveryFitDecision,
  fitDecisionReason?: string,
) {
  await requireStaff();
  const appointment = await prisma.discoveryAppointment.update({
    where: { id: appointmentId },
    data: {
      fitDecision,
      fitDecisionReason: fitDecisionReason?.trim() || null,
    },
  });
  revalidateAdminClientPage(appointment.clientId);
  return { success: true };
}

export async function saveDiscoveryRecap(appointmentId: string, recapContent: string) {
  await requireStaff();
  const appointment = await prisma.discoveryAppointment.update({
    where: { id: appointmentId },
    data: { recapContent: recapContent.trim() },
  });
  revalidateAdminClientPage(appointment.clientId);
  return { success: true };
}

export async function sendDiscoveryRecap(appointmentId: string) {
  const session = await requireStaff();
  const appointment = await prisma.discoveryAppointment.findUnique({
    where: { id: appointmentId },
    include: { client: true },
  });
  if (!appointment?.recapContent) {
    return { error: "Add recap content before sending." };
  }

  const emailResult = await sendDiscoveryRecapEmail({
    to: appointment.customerEmail,
    contactName: appointment.customerContactName,
    companyName: appointment.client.companyName,
    recapContent: appointment.recapContent,
  });

  await prisma.discoveryAppointment.update({
    where: { id: appointment.id },
    data: { recapSentAt: new Date() },
  });

  await writeAuditLog({
    actorUserId: session.user.id,
    action: "discovery.recap.sent",
    entityType: "DiscoveryAppointment",
    entityId: appointment.id,
  });

  revalidateAdminClientPage(appointment.clientId);

  if ("error" in emailResult && emailResult.error) {
    return { success: true, warning: emailResult.error };
  }
  return { success: true };
}

export async function markDiscoveryCompleted(appointmentId: string) {
  await requireStaff();
  const appointment = await prisma.discoveryAppointment.update({
    where: { id: appointmentId },
    data: { status: "COMPLETED", completedAt: new Date() },
  });
  revalidateAdminClientPage(appointment.clientId);
  return { success: true };
}

export async function markDiscoveryNoShow(appointmentId: string) {
  await requireStaff();
  const appointment = await prisma.discoveryAppointment.update({
    where: { id: appointmentId },
    data: { status: "NO_SHOW", noShowAt: new Date() },
  });
  revalidateAdminClientPage(appointment.clientId);
  return { success: true };
}

export type DiscoveryAvailabilitySettingsInput = {
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

export async function updateDiscoveryAvailabilitySettings(
  input: DiscoveryAvailabilitySettingsInput,
) {
  const session = await requireStaff();
  await ensureDiscoveryAvailabilitySettings();

  await prisma.discoveryAvailabilitySettings.update({
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

  revalidatePath("/admin/settings/discovery-availability");
  revalidatePath("/admin/settings/calendar");
  return { success: true };
}

export async function getDiscoveryAvailabilitySettingsForAdmin() {
  await requireStaff();
  const settings = await ensureDiscoveryAvailabilitySettings();
  return settings;
}
