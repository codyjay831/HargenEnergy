import "server-only";

import {
  GoogleCalendarSyncStatus,
  DiscoveryAppointmentStatus,
  DiscoveryReminderStatus,
  DiscoverySchedulingLinkStatus,
} from "@/generated/prisma/client";
import { addMinutes } from "date-fns";
import {
  createDiscoveryCalendarEvent,
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

      let googleEventId = input.googleEventId;
      let googleEventLink: string | null = null;
      let meetingUrl: string | null = null;
      let meetingType: string | null = null;
      const googleSyncStatus = GoogleCalendarSyncStatus.SYNCED;

      if (input.mode === "reschedule" && input.googleEventId) {
        await updateDiscoveryCalendarEvent({
          connectionId: connection.id,
          calendarId: connection.calendarId!,
          eventId: input.googleEventId,
          startUtc: input.slotStartUtc,
          endUtc,
          timezone: settings.timezone,
        });
        const existing = await tx.discoveryAppointment.findUnique({
          where: { id: input.appointmentId },
          select: { meetingUrl: true, meetingType: true, googleEventLink: true },
        });
        meetingUrl = existing?.meetingUrl ?? null;
        meetingType = existing?.meetingType ?? null;
        googleEventLink = existing?.googleEventLink ?? null;
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
        googleEventId = calendarResult.eventId;
        googleEventLink = calendarResult.htmlLink;
        meetingUrl = calendarResult.meetingUrl;
        meetingType = calendarResult.meetingType;
      }

      await tx.discoveryAppointment.update({
        where: { id: input.appointmentId },
        data: {
          scheduledStartUtc: input.slotStartUtc,
          scheduledEndUtc: endUtc,
          timezone: settings.timezone,
          status: nextStatus,
          canceledAt: null,
          googleEventId,
          googleEventLink,
          meetingUrl,
          meetingType,
          googleSyncStatus,
          googleSyncError: null,
        },
      });

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

      if (input.mode === "rebook" || !input.googleEventId) {
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
    if (error instanceof Error && error.message === "OVERLAP") {
      return { error: "That time is no longer available. Please choose another slot." };
    }
    return {
      error:
        input.mode === "reschedule"
          ? "Unable to reschedule. Please try another time or contact us."
          : "Unable to book. Please try another time or contact us.",
    };
  }
}
