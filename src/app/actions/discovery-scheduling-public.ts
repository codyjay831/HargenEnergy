"use server";

import { revalidatePath } from "next/cache";
import {
  DiscoveryAppointmentStatus,
  DiscoverySchedulingLinkStatus,
} from "@/generated/prisma/client";
import { bookDiscoverySlotAtomic, loadPublicSlotOptions } from "@/lib/discovery-scheduling/book-slot";
import { prisma } from "@/lib/prisma";
import { checkRateLimit, getRateLimitIdentifier } from "@/lib/rate-limit";
import { getDiscoverySchedulingReadiness } from "@/lib/discovery-scheduling/scheduling-readiness";
import {
  hashSchedulingToken,
  isSchedulingLinkExpired,
} from "@/lib/discovery-scheduling/tokens";
import {
  sendDiscoveryBookingConfirmationEmail,
  sendDiscoveryCancelAdminNotification,
  sendDiscoveryCancelEmail,
  sendDiscoveryRescheduleEmail,
} from "@/lib/email";
import { writeAuditLog } from "@/lib/audit-log";
import { revalidateAdminClientPage } from "@/lib/revalidate-paths";
import { discoveryCalendarIcsUrl, discoverySchedulingUrl } from "@/lib/app-url";
import { buildDiscoveryCalendarArtifacts } from "@/lib/discovery-scheduling/calendar-ics-server";
import { cancelDiscoveryCalendarEvent } from "@/lib/google-calendar/events";
import { getActiveGoogleCalendarConnection } from "@/lib/google-calendar/token-store";
import {
  deriveDiscoveryPublicPageMode,
  isDiscoveryAppointmentCancelable,
} from "@/lib/discovery-scheduling/public-page-mode";
import { applyDiscoverySlotChange } from "@/lib/discovery-scheduling/reschedule-slot";

async function resolveSchedulingLink(rawToken: string) {
  const tokenHash = hashSchedulingToken(rawToken);
  const link = await prisma.discoverySchedulingLink.findUnique({
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
    link.status === DiscoverySchedulingLinkStatus.ACTIVE &&
    isSchedulingLinkExpired(link.expiresAt)
  ) {
    await prisma.discoverySchedulingLink.update({
      where: { id: link.id },
      data: { status: DiscoverySchedulingLinkStatus.EXPIRED },
    });
    return { ...link, status: DiscoverySchedulingLinkStatus.EXPIRED };
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

export async function getDiscoverySchedulingPageData(rawToken: string) {
  const readiness = await getDiscoverySchedulingReadiness();
  if (!readiness.ready) {
    return { unavailable: true as const };
  }

  const link = await resolveSchedulingLink(rawToken);
  if (
    !link ||
    link.status === DiscoverySchedulingLinkStatus.EXPIRED ||
    link.status === DiscoverySchedulingLinkStatus.REVOKED
  ) {
    return { invalid: true as const };
  }

  if (!link.openedAt) {
    await prisma.discoverySchedulingLink.update({
      where: { id: link.id },
      data: { openedAt: new Date() },
    });
  }

  const pageMode = deriveDiscoveryPublicPageMode(link);
  const appointment = link.appointment;

  if (pageMode === "manage" && appointment) {
    const manageUrl = discoverySchedulingUrl(rawToken);
    const schedulingLinkId = appointment.schedulingLinkId ?? link.id;
    const calendar = buildDiscoveryCalendarArtifacts({
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
        icsUrl: discoveryCalendarIcsUrl(rawToken),
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

export async function getDiscoverySchedulingSlots(rawToken: string) {
  const readiness = await getDiscoverySchedulingReadiness();
  if (!readiness.ready) {
    return { error: "Scheduling is temporarily unavailable." };
  }

  const link = await resolveSchedulingLink(rawToken);
  if (
    !link ||
    link.status === DiscoverySchedulingLinkStatus.EXPIRED ||
    link.status === DiscoverySchedulingLinkStatus.REVOKED
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
  const limited = await checkRateLimit("discovery-book", identifier);
  if (!limited.allowed) {
    return { error: "Too many attempts. Please try again later." };
  }

  const readiness = await getDiscoverySchedulingReadiness();
  if (!readiness.ready) {
    return { error: "Scheduling is temporarily unavailable." };
  }

  const link = await resolveSchedulingLink(rawToken);
  if (
    !link ||
    link.status === DiscoverySchedulingLinkStatus.EXPIRED ||
    link.status === DiscoverySchedulingLinkStatus.REVOKED
  ) {
    return { error: "This scheduling link is no longer available." };
  }

  const appointment = link.appointment;
  if (!appointment) {
    return { error: "No appointment found for this link." };
  }

  const schedulingLinkId = appointment.schedulingLinkId ?? link.id;
  const result = await applyDiscoverySlotChange({
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

  const updated = await prisma.discoveryAppointment.findUnique({
    where: { id: result.appointmentId },
  });

  if (updated) {
    if (mode === "reschedule") {
      await sendDiscoveryRescheduleEmail({
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
      await sendDiscoveryBookingConfirmationEmail({
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

export async function rescheduleDiscoveryAppointment(rawToken: string, slotStartUtc: string) {
  return applySlotChangeForLink(rawToken, slotStartUtc, "reschedule");
}

export async function rebookDiscoveryAppointment(rawToken: string, slotStartUtc: string) {
  return applySlotChangeForLink(rawToken, slotStartUtc, "rebook");
}

export async function bookDiscoverySlot(
  rawToken: string,
  slotStartUtc: string,
  contact: { contactName: string; email: string; phone?: string },
) {
  const identifier = `${await getRateLimitIdentifier()}:${rawToken.slice(0, 16)}`;
  const limited = await checkRateLimit("discovery-book", identifier);
  if (!limited.allowed) {
    return { error: "Too many attempts. Please try again later." };
  }

  const readiness = await getDiscoverySchedulingReadiness();
  if (!readiness.ready) {
    return { error: "Scheduling is temporarily unavailable." };
  }

  const link = await resolveSchedulingLink(rawToken);
  if (!link || link.status !== DiscoverySchedulingLinkStatus.ACTIVE) {
    return { error: "This scheduling link is no longer available." };
  }

  if (link.appointment) {
    return { error: "An appointment already exists for this link." };
  }

  const result = await bookDiscoverySlotAtomic({
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

  const appointment = await prisma.discoveryAppointment.findUnique({
    where: { id: result.appointmentId },
  });

  if (appointment) {
    await sendDiscoveryBookingConfirmationEmail({
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

export async function cancelDiscoveryAppointment(rawToken: string) {
  const identifier = `${await getRateLimitIdentifier()}:${rawToken.slice(0, 16)}`;
  const limited = await checkRateLimit("discovery-book", identifier);
  if (!limited.allowed) {
    return { error: "Too many attempts. Please try again later." };
  }

  const link = await resolveSchedulingLink(rawToken);
  if (!link?.appointment) {
    return { error: "No scheduled appointment found." };
  }

  const appointment = link.appointment;
  if (!isDiscoveryAppointmentCancelable(appointment.status)) {
    if (appointment.status === DiscoveryAppointmentStatus.CANCELED) {
      return { error: "This appointment is already canceled." };
    }
    return { error: "This appointment cannot be canceled." };
  }

  const connection = await getActiveGoogleCalendarConnection();
  if (connection?.calendarId && appointment.googleEventId) {
    await cancelDiscoveryCalendarEvent({
      connectionId: connection.id,
      calendarId: connection.calendarId,
      eventId: appointment.googleEventId,
    });
  }

  await prisma.$transaction(async (tx) => {
    await tx.discoveryAppointment.update({
      where: { id: appointment.id },
      data: {
        status: DiscoveryAppointmentStatus.CANCELED,
        canceledAt: new Date(),
        googleEventId: null,
        googleEventLink: null,
        meetingUrl: null,
      },
    });
    await tx.discoveryReminder.updateMany({
      where: {
        appointmentId: appointment.id,
        status: "PENDING",
      },
      data: { status: "SKIPPED" },
    });
  });

  await writeAuditLog({
    action: "discovery.appointment.canceled",
    entityType: "DiscoveryAppointment",
    entityId: appointment.id,
    metadata: {
      clientId: link.clientId,
      canceledBy: "prospect",
    },
  });

  revalidateAdminClientPage(link.clientId);
  revalidatePath("/admin");

  const schedulingLinkId = appointment.schedulingLinkId ?? link.id;
  await sendDiscoveryCancelEmail({
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

  await sendDiscoveryCancelAdminNotification({
    companyName: link.client.companyName,
    clientId: link.clientId,
    startUtc: appointment.scheduledStartUtc,
    timezone: appointment.timezone,
  });

  return { success: true };
}
