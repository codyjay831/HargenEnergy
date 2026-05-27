import "server-only";

import {
  GoogleCalendarSyncStatus,
  DiscoveryAppointmentStatus,
  DiscoveryReminderStatus,
  DiscoverySchedulingLinkStatus,
} from "@/generated/prisma/client";
import { addMinutes } from "date-fns";
import {
  cancelDiscoveryCalendarEvent,
  createDiscoveryCalendarEvent,
  GoogleCalendarEventNotFoundError,
  updateDiscoveryCalendarEvent,
} from "@/lib/google-calendar/events";
import { getActiveGoogleCalendarConnection } from "@/lib/google-calendar/token-store";
import { prisma } from "@/lib/prisma";
import { getDiscoveryAvailabilitySettings } from "@/lib/discovery-scheduling/availability-settings";
import {
  buildReminderRows,
  buildSlotGeneratorContext,
} from "@/lib/discovery-scheduling/book-slot";
import { blockedRangeOverlapsAny } from "@/lib/discovery-scheduling/overlap";
import { isSlotStillAvailable } from "@/lib/discovery-scheduling/slot-generator";
import { isDiscoveryAppointmentManageable } from "@/lib/discovery-scheduling/public-page-mode";

export type ApplyDiscoverySlotChangeMode = "reschedule" | "rebook";

export type ApplyDiscoverySlotChangeInput = {
  mode: ApplyDiscoverySlotChangeMode;
  schedulingLinkId: string;
  appointmentId: string;
  slotStartUtc: Date;
  companyName: string;
  customerContactName: string;
  customerEmail: string;
  customerPhone?: string | null;
  currentStatus: DiscoveryAppointmentStatus;
  googleEventId: string | null;
};

function summarizeError(error: unknown): string {
  if (error instanceof Error) {
    return error.message.slice(0, 500);
  }
  return "Unknown error";
}

export async function applyDiscoverySlotChange(
  input: ApplyDiscoverySlotChangeInput,
): Promise<{ success: true; appointmentId: string } | { error: string }> {
  if (input.mode === "reschedule") {
    if (!isDiscoveryAppointmentManageable(input.currentStatus)) {
      return { error: "This appointment cannot be rescheduled." };
    }
  } else if (input.currentStatus !== DiscoveryAppointmentStatus.CANCELED) {
    return { error: "This appointment cannot be rebooked." };
  }

  const settings = await getDiscoveryAvailabilitySettings();
  const connection = await getActiveGoogleCalendarConnection();

  if (!settings || !connection?.calendarId) {
    return { error: "Scheduling is temporarily unavailable." };
  }

  const endUtc = addMinutes(input.slotStartUtc, settings.slotDurationMinutes);
  const { slotInput, busyBlocksUtc, existingAppointments, now } =
    await buildSlotGeneratorContext(settings, connection, {
      excludeAppointmentId: input.appointmentId,
    });

  if (!isSlotStillAvailable(slotInput, input.slotStartUtc)) {
    return { error: "That time is no longer available. Please choose another slot." };
  }

  const blockStart = addMinutes(input.slotStartUtc, -settings.bufferBeforeMinutes);
  const blockEnd = addMinutes(endUtc, settings.bufferAfterMinutes);
  if (blockedRangeOverlapsAny(blockStart, blockEnd, [...busyBlocksUtc, ...existingAppointments])) {
    return { error: "That time is no longer available. Please choose another slot." };
  }

  const useMeet = connection.meetCreationEnabled;
  const nextStatus =
    input.mode === "reschedule"
      ? DiscoveryAppointmentStatus.RESCHEDULED
      : DiscoveryAppointmentStatus.SCHEDULED;
  const expectedStatuses =
    input.mode === "reschedule"
      ? [DiscoveryAppointmentStatus.SCHEDULED, DiscoveryAppointmentStatus.RESCHEDULED]
      : [DiscoveryAppointmentStatus.CANCELED];

  let googleEventId = input.googleEventId;
  let googleCalendarId = connection.calendarId;
  let googleEventLink: string | null = null;
  let meetingUrl: string | null = null;
  let meetingType: string | null = null;
  let createdEventIdForCleanup: string | null = null;
  let createdEventCalendarIdForCleanup: string | null = null;

  const appointment = await prisma.discoveryAppointment.findUnique({
    where: { id: input.appointmentId },
    select: {
      status: true,
      googleEventId: true,
      googleCalendarId: true,
      googleEventLink: true,
      meetingUrl: true,
      meetingType: true,
    },
  });
  if (!appointment) {
    return { error: "No appointment found for this link." };
  }
  if (input.mode === "reschedule" && !isDiscoveryAppointmentManageable(appointment.status)) {
    return { error: "This appointment cannot be rescheduled." };
  }
  if (input.mode === "rebook" && appointment.status !== DiscoveryAppointmentStatus.CANCELED) {
    return { error: "This appointment cannot be rebooked." };
  }

  googleEventId = appointment.googleEventId;
  googleCalendarId = appointment.googleCalendarId ?? connection.calendarId;
  googleEventLink = appointment.googleEventLink;
  meetingUrl = appointment.meetingUrl;
  meetingType = appointment.meetingType;

  try {
    if (input.mode === "reschedule" && appointment.googleEventId && googleCalendarId) {
      try {
        await updateDiscoveryCalendarEvent({
          connectionId: connection.id,
          calendarId: googleCalendarId,
          eventId: appointment.googleEventId,
          startUtc: input.slotStartUtc,
          endUtc,
          timezone: settings.timezone,
        });
      } catch (error) {
        if (!(error instanceof GoogleCalendarEventNotFoundError)) {
          throw error;
        }
        const calendarResult = await createDiscoveryCalendarEvent({
          connectionId: connection.id,
          calendarId: connection.calendarId!,
          summary: `Discovery — ${input.companyName}`,
          description: `Hargen Energy discovery with ${input.customerContactName}.`,
          startUtc: input.slotStartUtc,
          endUtc,
          timezone: settings.timezone,
          attendeeEmail: input.customerEmail,
          attendeeName: input.customerContactName,
          phone: input.customerPhone,
          useMeet,
          fallbackMeetingUrl: settings.defaultMeetingUrl,
        });
        createdEventIdForCleanup = calendarResult.eventId;
        createdEventCalendarIdForCleanup = connection.calendarId!;
        googleEventId = calendarResult.eventId;
        googleCalendarId = connection.calendarId!;
        googleEventLink = calendarResult.htmlLink;
        meetingUrl = calendarResult.meetingUrl;
        meetingType = calendarResult.meetingType;
      }
    } else {
      const calendarResult = await createDiscoveryCalendarEvent({
        connectionId: connection.id,
        calendarId: connection.calendarId!,
        summary: `Discovery — ${input.companyName}`,
        description: `Hargen Energy discovery with ${input.customerContactName}.`,
        startUtc: input.slotStartUtc,
        endUtc,
        timezone: settings.timezone,
        attendeeEmail: input.customerEmail,
        attendeeName: input.customerContactName,
        phone: input.customerPhone,
        useMeet,
        fallbackMeetingUrl: settings.defaultMeetingUrl,
      });
      createdEventIdForCleanup = calendarResult.eventId;
      createdEventCalendarIdForCleanup = connection.calendarId!;
      googleEventId = calendarResult.eventId;
      googleCalendarId = connection.calendarId!;
      googleEventLink = calendarResult.htmlLink;
      meetingUrl = calendarResult.meetingUrl;
      meetingType = calendarResult.meetingType;
    }
  } catch (error) {
    console.error("[discovery-scheduling] calendar sync failed before slot update", {
      appointmentId: input.appointmentId,
      mode: input.mode,
      error,
    });
    await prisma.discoveryAppointment.update({
      where: { id: input.appointmentId },
      data: {
        googleSyncStatus: GoogleCalendarSyncStatus.FAILED,
        googleSyncError: summarizeError(error),
      },
    });
    return {
      error:
        input.mode === "reschedule"
          ? "Unable to reschedule. Please try another time or contact us."
          : "Unable to book. Please try another time or contact us.",
    };
  }

  try {
    const appointmentId = await prisma.$transaction(async (tx) => {
      const overlap = await tx.discoveryAppointment.findFirst({
        where: {
          id: { not: input.appointmentId },
          status: {
            in: [DiscoveryAppointmentStatus.SCHEDULED, DiscoveryAppointmentStatus.RESCHEDULED],
          },
          scheduledStartUtc: { lt: endUtc },
          scheduledEndUtc: { gt: input.slotStartUtc },
        },
      });
      if (overlap) {
        throw new Error("OVERLAP");
      }

      const updated = await tx.discoveryAppointment.updateMany({
        where: {
          id: input.appointmentId,
          status: { in: expectedStatuses },
        },
        data: {
          scheduledStartUtc: input.slotStartUtc,
          scheduledEndUtc: endUtc,
          timezone: settings.timezone,
          status: nextStatus,
          canceledAt: null,
          googleEventId,
          googleCalendarId,
          googleEventLink,
          meetingUrl,
          meetingType,
          googleSyncStatus: GoogleCalendarSyncStatus.SYNCED,
          googleSyncError: null,
        },
      });
      if (updated.count === 0) {
        throw new Error("STATUS_CONFLICT");
      }

      await tx.discoverySchedulingLink.update({
        where: { id: input.schedulingLinkId },
        data: { status: DiscoverySchedulingLinkStatus.USED },
      });

      await tx.discoveryReminder.updateMany({
        where: {
          appointmentId: input.appointmentId,
          status: DiscoveryReminderStatus.PENDING,
        },
        data: { status: DiscoveryReminderStatus.SKIPPED },
      });

      const reminderRows = buildReminderRows(input.appointmentId, input.slotStartUtc, now, {
        smsRemindersEnabled: settings.smsRemindersEnabled,
        customerPhone: input.customerPhone,
      });
      if (reminderRows.length > 0) {
        await tx.discoveryReminder.createMany({ data: reminderRows });
      }

      if (input.mode === "rebook" || !appointment.googleEventId || createdEventIdForCleanup) {
        await tx.googleCalendarConnection.update({
          where: { id: connection.id },
          data: {
            meetLastSuccessAt: useMeet ? new Date() : connection.meetLastSuccessAt,
            lastSyncAt: new Date(),
            lastSyncError: null,
          },
        });
      }

      return input.appointmentId;
    });

    return { success: true, appointmentId };
  } catch (error) {
    if (createdEventIdForCleanup && createdEventCalendarIdForCleanup) {
      try {
        await cancelDiscoveryCalendarEvent({
          connectionId: connection.id,
          calendarId: createdEventCalendarIdForCleanup,
          eventId: createdEventIdForCleanup,
        });
      } catch (cleanupError) {
        console.error("[discovery-scheduling] failed to cleanup slot-change event", {
          appointmentId: input.appointmentId,
          eventId: createdEventIdForCleanup,
          cleanupError,
        });
      }
    }

    if (error instanceof Error && error.message === "OVERLAP") {
      return { error: "That time is no longer available. Please choose another slot." };
    }
    if (error instanceof Error && error.message === "STATUS_CONFLICT") {
      return { error: "This appointment changed while you were booking. Refresh and try again." };
    }

    console.error("[discovery-scheduling] slot-change transaction failed", {
      appointmentId: input.appointmentId,
      mode: input.mode,
      error,
    });
    await prisma.discoveryAppointment.update({
      where: { id: input.appointmentId },
      data: {
        googleSyncStatus: GoogleCalendarSyncStatus.FAILED,
        googleSyncError: summarizeError(error),
      },
    });
    return {
      error:
        input.mode === "reschedule"
          ? "Unable to reschedule. Please try another time or contact us."
          : "Unable to book. Please try another time or contact us.",
    };
  }
}
