"use server";

import { revalidatePath } from "next/cache";
import {
  WalkthroughAppointmentStatus,
  WalkthroughSchedulingLinkStatus,
} from "@/generated/prisma/client";
import { bookWalkthroughSlotAtomic, loadPublicSlotOptions } from "@/lib/walkthrough-scheduling/book-slot";
import { prisma } from "@/lib/prisma";
import { checkRateLimit, getRateLimitIdentifier } from "@/lib/rate-limit";
import { getWalkthroughSchedulingReadiness } from "@/lib/walkthrough-scheduling/scheduling-readiness";
import {
  hashSchedulingToken,
  isSchedulingLinkExpired,
} from "@/lib/walkthrough-scheduling/tokens";
import {
  sendWalkthroughBookingConfirmationEmail,
  sendWalkthroughCancelAdminNotification,
  sendWalkthroughCancelEmail,
  sendWalkthroughRescheduleEmail,
} from "@/lib/email";
import { writeAuditLog } from "@/lib/audit-log";
import { revalidateAdminClientPage } from "@/lib/revalidate-paths";
import { walkthroughCalendarIcsUrl, walkthroughSchedulingUrl } from "@/lib/app-url";
import { buildWalkthroughCalendarArtifacts } from "@/lib/walkthrough-scheduling/calendar-ics-server";
import { cancelWalkthroughCalendarEvent } from "@/lib/google-calendar/events";
import { getActiveGoogleCalendarConnection } from "@/lib/google-calendar/token-store";
import {
  deriveWalkthroughPublicPageMode,
  isWalkthroughAppointmentCancelable,
} from "@/lib/walkthrough-scheduling/public-page-mode";
import { applyWalkthroughSlotChange } from "@/lib/walkthrough-scheduling/reschedule-slot";

async function resolveSchedulingLink(rawToken: string) {
  const tokenHash = hashSchedulingToken(rawToken);
  const link = await prisma.walkthroughSchedulingLink.findUnique({
    where: { tokenHash },
    include: {
      client: true,
      supportRequest: true,
      appointment: true,
    },
  });
  if (!link) {
    return null;
  }

  if (
    link.status === WalkthroughSchedulingLinkStatus.ACTIVE &&
    isSchedulingLinkExpired(link.expiresAt)
  ) {
    await prisma.walkthroughSchedulingLink.update({
      where: { id: link.id },
      data: { status: WalkthroughSchedulingLinkStatus.EXPIRED },
    });
    return { ...link, status: WalkthroughSchedulingLinkStatus.EXPIRED };
  }

  return link;
}

function mapSlots(slots: Awaited<ReturnType<typeof loadPublicSlotOptions>>) {
  return slots.map((slot) => ({
    startUtc: slot.startUtc.toISOString(),
    endUtc: slot.endUtc.toISOString(),
    displayTimezone: slot.displayTimezone,
  }));
}

export async function getWalkthroughSchedulingPageData(rawToken: string) {
  const readiness = await getWalkthroughSchedulingReadiness();
  if (!readiness.ready) {
    return { unavailable: true as const };
  }

  const link = await resolveSchedulingLink(rawToken);
  if (
    !link ||
    link.status === WalkthroughSchedulingLinkStatus.EXPIRED ||
    link.status === WalkthroughSchedulingLinkStatus.REVOKED
  ) {
    return { invalid: true as const };
  }

  if (!link.openedAt) {
    await prisma.walkthroughSchedulingLink.update({
      where: { id: link.id },
      data: { openedAt: new Date() },
    });
  }

  const pageMode = deriveWalkthroughPublicPageMode(link);
  const appointment = link.appointment;

  if (pageMode === "manage" && appointment) {
    const manageUrl = walkthroughSchedulingUrl(rawToken);
    const schedulingLinkId = appointment.schedulingLinkId ?? link.id;
    const calendar = buildWalkthroughCalendarArtifacts({
      appointmentId: appointment.id,
      companyName: link.client.companyName,
      startUtc: appointment.scheduledStartUtc,
      endUtc: appointment.scheduledEndUtc,
      meetingUrl: appointment.meetingUrl,
      schedulingLinkId,
      manageUrl,
    });

    return {
      mode: "manage" as const,
      companyName: link.client.companyName,
      contactName: link.client.contactName,
      appointment: {
        scheduledStartUtc: appointment.scheduledStartUtc.toISOString(),
        scheduledEndUtc: appointment.scheduledEndUtc.toISOString(),
        timezone: appointment.timezone,
        meetingUrl: appointment.meetingUrl,
        status: appointment.status,
      },
      calendarLinks: {
        googleUrl: calendar.googleUrl,
        icsUrl: walkthroughCalendarIcsUrl(rawToken),
      },
    };
  }

  if (pageMode === "canceled" && appointment) {
    return {
      mode: "canceled" as const,
      companyName: link.client.companyName,
      contactName: appointment.customerContactName,
      customerEmail: appointment.customerEmail,
      appointment: {
        scheduledStartUtc: appointment.scheduledStartUtc.toISOString(),
        scheduledEndUtc: appointment.scheduledEndUtc.toISOString(),
        timezone: appointment.timezone,
      },
    };
  }

  if (pageMode === "closed" && appointment) {
    return {
      mode: "closed" as const,
      companyName: link.client.companyName,
      contactName: appointment.customerContactName,
      appointment: {
        scheduledStartUtc: appointment.scheduledStartUtc.toISOString(),
        scheduledEndUtc: appointment.scheduledEndUtc.toISOString(),
        timezone: appointment.timezone,
        status: appointment.status,
      },
    };
  }

  const slots = await loadPublicSlotOptions();
  return {
    mode: "book" as const,
    companyName: link.client.companyName,
    contactName: link.client.contactName,
    email: link.client.email,
    phone: link.client.phone,
    slots: mapSlots(slots),
  };
}

export async function getWalkthroughSchedulingSlots(rawToken: string) {
  const readiness = await getWalkthroughSchedulingReadiness();
  if (!readiness.ready) {
    return { error: "Scheduling is temporarily unavailable." };
  }

  const link = await resolveSchedulingLink(rawToken);
  if (
    !link ||
    link.status === WalkthroughSchedulingLinkStatus.EXPIRED ||
    link.status === WalkthroughSchedulingLinkStatus.REVOKED
  ) {
    return { error: "This scheduling link is no longer available." };
  }

  const slots = await loadPublicSlotOptions();
  return { slots: mapSlots(slots) };
}

async function applySlotChangeForLink(
  rawToken: string,
  slotStartUtc: string,
  mode: "reschedule" | "rebook",
) {
  const identifier = `${await getRateLimitIdentifier()}:${rawToken.slice(0, 16)}`;
  const limited = await checkRateLimit("walkthrough-book", identifier);
  if (!limited.allowed) {
    return { error: "Too many attempts. Please try again later." };
  }

  const readiness = await getWalkthroughSchedulingReadiness();
  if (!readiness.ready) {
    return { error: "Scheduling is temporarily unavailable." };
  }

  const link = await resolveSchedulingLink(rawToken);
  if (
    !link ||
    link.status === WalkthroughSchedulingLinkStatus.EXPIRED ||
    link.status === WalkthroughSchedulingLinkStatus.REVOKED
  ) {
    return { error: "This scheduling link is no longer available." };
  }

  const appointment = link.appointment;
  if (!appointment) {
    return { error: "No appointment found for this link." };
  }

  const schedulingLinkId = appointment.schedulingLinkId ?? link.id;
  const result = await applyWalkthroughSlotChange({
    mode,
    schedulingLinkId,
    appointmentId: appointment.id,
    slotStartUtc: new Date(slotStartUtc),
    companyName: link.client.companyName,
    customerContactName: appointment.customerContactName,
    customerEmail: appointment.customerEmail,
    customerPhone: appointment.customerPhone,
    currentStatus: appointment.status,
    googleEventId: appointment.googleEventId,
  });

  if ("error" in result) {
    return result;
  }

  const updated = await prisma.walkthroughAppointment.findUnique({
    where: { id: result.appointmentId },
  });

  if (updated) {
    if (mode === "reschedule") {
      await sendWalkthroughRescheduleEmail({
        to: updated.customerEmail,
        contactName: updated.customerContactName,
        companyName: link.client.companyName,
        appointmentId: updated.id,
        schedulingLinkId: schedulingLinkId,
        startUtc: updated.scheduledStartUtc,
        endUtc: updated.scheduledEndUtc,
        timezone: updated.timezone,
        meetingUrl: updated.meetingUrl,
        schedulingToken: rawToken,
      });
    } else {
      await sendWalkthroughBookingConfirmationEmail({
        to: updated.customerEmail,
        contactName: updated.customerContactName,
        companyName: link.client.companyName,
        appointmentId: updated.id,
        schedulingLinkId: schedulingLinkId,
        startUtc: updated.scheduledStartUtc,
        endUtc: updated.scheduledEndUtc,
        timezone: updated.timezone,
        meetingUrl: updated.meetingUrl,
        schedulingToken: rawToken,
      });
    }
  }

  return { success: true };
}

export async function rescheduleWalkthroughAppointment(rawToken: string, slotStartUtc: string) {
  return applySlotChangeForLink(rawToken, slotStartUtc, "reschedule");
}

export async function rebookWalkthroughAppointment(rawToken: string, slotStartUtc: string) {
  return applySlotChangeForLink(rawToken, slotStartUtc, "rebook");
}

export async function bookWalkthroughSlot(
  rawToken: string,
  slotStartUtc: string,
  contact: { contactName: string; email: string; phone?: string },
) {
  const identifier = `${await getRateLimitIdentifier()}:${rawToken.slice(0, 16)}`;
  const limited = await checkRateLimit("walkthrough-book", identifier);
  if (!limited.allowed) {
    return { error: "Too many attempts. Please try again later." };
  }

  const readiness = await getWalkthroughSchedulingReadiness();
  if (!readiness.ready) {
    return { error: "Scheduling is temporarily unavailable." };
  }

  const link = await resolveSchedulingLink(rawToken);
  if (!link || link.status !== WalkthroughSchedulingLinkStatus.ACTIVE) {
    return { error: "This scheduling link is no longer available." };
  }

  if (link.appointment) {
    return { error: "An appointment already exists for this link." };
  }

  const result = await bookWalkthroughSlotAtomic({
    schedulingLinkId: link.id,
    clientId: link.clientId,
    supportRequestId: link.supportRequestId,
    slotStartUtc: new Date(slotStartUtc),
    customerContactName: contact.contactName.trim(),
    customerEmail: contact.email.trim(),
    customerPhone: contact.phone?.trim() || null,
    companyName: link.client.companyName,
  });

  if ("error" in result) {
    return result;
  }

  const appointment = await prisma.walkthroughAppointment.findUnique({
    where: { id: result.appointmentId },
  });

  if (appointment) {
    await sendWalkthroughBookingConfirmationEmail({
      to: appointment.customerEmail,
      contactName: appointment.customerContactName,
      companyName: link.client.companyName,
      appointmentId: appointment.id,
      schedulingLinkId: appointment.schedulingLinkId ?? link.id,
      startUtc: appointment.scheduledStartUtc,
      endUtc: appointment.scheduledEndUtc,
      timezone: appointment.timezone,
      meetingUrl: appointment.meetingUrl,
      schedulingToken: rawToken,
    });
  }

  return { success: true };
}

export async function cancelWalkthroughAppointment(rawToken: string) {
  const identifier = `${await getRateLimitIdentifier()}:${rawToken.slice(0, 16)}`;
  const limited = await checkRateLimit("walkthrough-book", identifier);
  if (!limited.allowed) {
    return { error: "Too many attempts. Please try again later." };
  }

  const link = await resolveSchedulingLink(rawToken);
  if (!link?.appointment) {
    return { error: "No scheduled appointment found." };
  }

  const appointment = link.appointment;
  if (!isWalkthroughAppointmentCancelable(appointment.status)) {
    if (appointment.status === WalkthroughAppointmentStatus.CANCELED) {
      return { error: "This appointment is already canceled." };
    }
    return { error: "This appointment cannot be canceled." };
  }

  const connection = await getActiveGoogleCalendarConnection();
  if (connection?.calendarId && appointment.googleEventId) {
    await cancelWalkthroughCalendarEvent({
      connectionId: connection.id,
      calendarId: connection.calendarId,
      eventId: appointment.googleEventId,
    });
  }

  await prisma.$transaction(async (tx) => {
    await tx.walkthroughAppointment.update({
      where: { id: appointment.id },
      data: {
        status: WalkthroughAppointmentStatus.CANCELED,
        canceledAt: new Date(),
        googleEventId: null,
        googleEventLink: null,
        meetingUrl: null,
      },
    });
    await tx.walkthroughReminder.updateMany({
      where: {
        appointmentId: appointment.id,
        status: "PENDING",
      },
      data: { status: "SKIPPED" },
    });
  });

  await writeAuditLog({
    action: "walkthrough.appointment.canceled",
    entityType: "WalkthroughAppointment",
    entityId: appointment.id,
    metadata: {
      clientId: link.clientId,
      canceledBy: "prospect",
    },
  });

  revalidateAdminClientPage(link.clientId);
  revalidatePath("/admin");

  const schedulingLinkId = appointment.schedulingLinkId ?? link.id;
  await sendWalkthroughCancelEmail({
    to: appointment.customerEmail,
    contactName: appointment.customerContactName,
    companyName: link.client.companyName,
    appointmentId: appointment.id,
    schedulingLinkId,
    startUtc: appointment.scheduledStartUtc,
    endUtc: appointment.scheduledEndUtc,
    timezone: appointment.timezone,
    meetingUrl: appointment.meetingUrl,
  });

  await sendWalkthroughCancelAdminNotification({
    companyName: link.client.companyName,
    clientId: link.clientId,
    startUtc: appointment.scheduledStartUtc,
    timezone: appointment.timezone,
  });

  return { success: true };
}
