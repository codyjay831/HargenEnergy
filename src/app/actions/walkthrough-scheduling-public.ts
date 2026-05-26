"use server";

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
  sendWalkthroughCancelEmail,
} from "@/lib/email";
import { cancelWalkthroughCalendarEvent } from "@/lib/google-calendar/events";
import { getActiveGoogleCalendarConnection } from "@/lib/google-calendar/token-store";

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

  if (link.appointment) {
    return {
      mode: "manage" as const,
      companyName: link.client.companyName,
      contactName: link.client.contactName,
      appointment: {
        scheduledStartUtc: link.appointment.scheduledStartUtc.toISOString(),
        scheduledEndUtc: link.appointment.scheduledEndUtc.toISOString(),
        timezone: link.appointment.timezone,
        meetingUrl: link.appointment.meetingUrl,
        status: link.appointment.status,
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
    slots: slots.map((slot) => ({
      startUtc: slot.startUtc.toISOString(),
      endUtc: slot.endUtc.toISOString(),
      displayTimezone: slot.displayTimezone,
    })),
  };
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
      startUtc: appointment.scheduledStartUtc,
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

  const connection = await getActiveGoogleCalendarConnection();
  if (connection?.calendarId && link.appointment.googleEventId) {
    await cancelWalkthroughCalendarEvent({
      connectionId: connection.id,
      calendarId: connection.calendarId,
      eventId: link.appointment.googleEventId,
    });
  }

  await prisma.$transaction(async (tx) => {
    await tx.walkthroughAppointment.update({
      where: { id: link.appointment!.id },
      data: {
        status: WalkthroughAppointmentStatus.CANCELED,
        canceledAt: new Date(),
      },
    });
    await tx.walkthroughReminder.updateMany({
      where: {
        appointmentId: link.appointment!.id,
        status: "PENDING",
      },
      data: { status: "SKIPPED" },
    });
  });

  await sendWalkthroughCancelEmail({
    to: link.appointment.customerEmail,
    contactName: link.appointment.customerContactName,
    companyName: link.client.companyName,
    startUtc: link.appointment.scheduledStartUtc,
    timezone: link.appointment.timezone,
  });

  return { success: true };
}
