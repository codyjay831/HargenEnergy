import "server-only";

import {
  GoogleCalendarSyncStatus,
  RequestStatus,
  DiscoveryAppointmentStatus,
  DiscoveryReminderChannel,
  DiscoveryReminderStatus,
  DiscoveryReminderType,
  DiscoverySchedulingLinkStatus,
} from "@/generated/prisma/client";
import { addHours, addMinutes } from "date-fns";
import { createDiscoveryCalendarEvent } from "@/lib/google-calendar/events";
import { fetchGoogleFreeBusy } from "@/lib/google-calendar/freebusy";
import { getActiveGoogleCalendarConnection } from "@/lib/google-calendar/token-store";
import { prisma } from "@/lib/prisma";
import { getDiscoveryAvailabilitySettings } from "@/lib/discovery-scheduling/availability-settings";
import { blockedRangeOverlapsAny } from "@/lib/discovery-scheduling/overlap";
import {
  generateAvailabilitySlots,
  isSlotStillAvailable,
} from "@/lib/discovery-scheduling/slot-generator";

export type BookDiscoverySlotInput = {
  schedulingLinkId: string;
  clientId: string;
  supportRequestId: string;
  slotStartUtc: Date;
  customerContactName: string;
  customerEmail: string;
  customerPhone?: string | null;
  companyName: string;
};

export function buildReminderRows(
  appointmentId: string,
  startUtc: Date,
  now: Date,
  options?: {
    smsRemindersEnabled?: boolean;
    customerPhone?: string | null;
  },
) {
  const rows: Array<{
    appointmentId: string;
    type: DiscoveryReminderType;
    channel: DiscoveryReminderChannel;
    scheduledFor: Date;
    status: DiscoveryReminderStatus;
  }> = [];

  rows.push({
    appointmentId,
    type: DiscoveryReminderType.CONFIRMATION,
    channel: DiscoveryReminderChannel.EMAIL,
    scheduledFor: now,
    status: DiscoveryReminderStatus.PENDING,
  });

  const twentyFourHour = addHours(startUtc, -24);
  if (twentyFourHour > now) {
    rows.push({
      appointmentId,
      type: DiscoveryReminderType.TWENTY_FOUR_HOUR,
      channel: DiscoveryReminderChannel.EMAIL,
      scheduledFor: twentyFourHour,
      status: DiscoveryReminderStatus.PENDING,
    });
    if (options?.smsRemindersEnabled && options.customerPhone?.trim()) {
      rows.push({
        appointmentId,
        type: DiscoveryReminderType.TWENTY_FOUR_HOUR,
        channel: DiscoveryReminderChannel.SMS,
        scheduledFor: twentyFourHour,
        status: DiscoveryReminderStatus.PENDING,
      });
    }
  }

  const oneHour = addHours(startUtc, -1);
  if (oneHour > now) {
    rows.push({
      appointmentId,
      type: DiscoveryReminderType.ONE_HOUR,
      channel: DiscoveryReminderChannel.EMAIL,
      scheduledFor: oneHour,
      status: DiscoveryReminderStatus.PENDING,
    });
    if (options?.smsRemindersEnabled && options.customerPhone?.trim()) {
      rows.push({
        appointmentId,
        type: DiscoveryReminderType.ONE_HOUR,
        channel: DiscoveryReminderChannel.SMS,
        scheduledFor: oneHour,
        status: DiscoveryReminderStatus.PENDING,
      });
    }
  }

  return rows;
}

export async function buildSlotGeneratorContext(
  settings: NonNullable<Awaited<ReturnType<typeof getDiscoveryAvailabilitySettings>>>,
  connection: NonNullable<Awaited<ReturnType<typeof getActiveGoogleCalendarConnection>>>,
  options?: { excludeAppointmentId?: string },
) {
  const now = new Date();
  const busyBlocksUtc = await fetchGoogleFreeBusy(
    connection.id,
    connection.calendarId!,
    addHours(now, settings.minimumNoticeHours),
    addMinutes(now, settings.bookingWindowDays * 24 * 60),
  );

  const existingAppointments = await prisma.discoveryAppointment.findMany({
    where: {
      status: {
        in: [DiscoveryAppointmentStatus.SCHEDULED, DiscoveryAppointmentStatus.RESCHEDULED],
      },
      ...(options?.excludeAppointmentId
        ? { id: { not: options.excludeAppointmentId } }
        : {}),
    },
    select: { scheduledStartUtc: true, scheduledEndUtc: true },
  });

  return {
    slotInput: {
      timezone: settings.timezone,
      slotDurationMinutes: settings.slotDurationMinutes,
      bufferBeforeMinutes: settings.bufferBeforeMinutes,
      bufferAfterMinutes: settings.bufferAfterMinutes,
      minimumNoticeHours: settings.minimumNoticeHours,
      bookingWindowDays: settings.bookingWindowDays,
      weekdayWindows: settings.weekdayWindows,
      blackoutDates: settings.blackoutDates,
      busyBlocksUtc,
      existingAppointments: existingAppointments.map((row) => ({
        start: row.scheduledStartUtc,
        end: row.scheduledEndUtc,
      })),
      now,
    },
    busyBlocksUtc,
    existingAppointments: existingAppointments.map((row) => ({
      start: row.scheduledStartUtc,
      end: row.scheduledEndUtc,
    })),
    now,
  };
}

export async function bookDiscoverySlotAtomic(
  input: BookDiscoverySlotInput,
): Promise<{ success: true; appointmentId: string } | { error: string }> {
  const settings = await getDiscoveryAvailabilitySettings();
  const connection = await getActiveGoogleCalendarConnection();

  if (!settings || !connection?.calendarId) {
    return { error: "Scheduling is temporarily unavailable." };
  }

  const endUtc = addMinutes(input.slotStartUtc, settings.slotDurationMinutes);
  const { slotInput, busyBlocksUtc, existingAppointments, now } =
    await buildSlotGeneratorContext(settings, connection);

  if (!isSlotStillAvailable(slotInput, input.slotStartUtc)) {
    return { error: "That time is no longer available. Please choose another slot." };
  }

  const blockStart = addMinutes(input.slotStartUtc, -settings.bufferBeforeMinutes);
  const blockEnd = addMinutes(endUtc, settings.bufferAfterMinutes);
  if (blockedRangeOverlapsAny(blockStart, blockEnd, [...busyBlocksUtc, ...existingAppointments])) {
    return { error: "That time is no longer available. Please choose another slot." };
  }

  const useMeet = connection.meetCreationEnabled;

  try {
    const appointmentId = await prisma.$transaction(async (tx) => {
      const overlap = await tx.discoveryAppointment.findFirst({
        where: {
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

      const created = await tx.discoveryAppointment.create({
        data: {
          clientId: input.clientId,
          supportRequestId: input.supportRequestId,
          schedulingLinkId: input.schedulingLinkId,
          scheduledStartUtc: input.slotStartUtc,
          scheduledEndUtc: endUtc,
          timezone: settings.timezone,
          meetingType: calendarResult.meetingType,
          meetingUrl: calendarResult.meetingUrl,
          customerContactName: input.customerContactName,
          customerEmail: input.customerEmail,
          customerPhone: input.customerPhone?.trim() || null,
          status: DiscoveryAppointmentStatus.SCHEDULED,
          googleEventId: calendarResult.eventId,
          googleEventLink: calendarResult.htmlLink,
          googleSyncStatus: GoogleCalendarSyncStatus.SYNCED,
        },
      });

      await tx.discoverySchedulingLink.update({
        where: { id: input.schedulingLinkId },
        data: { status: DiscoverySchedulingLinkStatus.USED },
      });

      await tx.supportRequest.updateMany({
        where: {
          id: input.supportRequestId,
          status: RequestStatus.NEW,
        },
        data: { status: RequestStatus.REVIEWED, needsInfo: false },
      });

      const reminderRows = buildReminderRows(created.id, input.slotStartUtc, now, {
        smsRemindersEnabled: settings.smsRemindersEnabled,
        customerPhone: input.customerPhone,
      });
      if (reminderRows.length > 0) {
        await tx.discoveryReminder.createMany({ data: reminderRows });
      }

      await tx.googleCalendarConnection.update({
        where: { id: connection.id },
        data: {
          meetLastSuccessAt: useMeet ? new Date() : connection.meetLastSuccessAt,
          lastSyncAt: new Date(),
          lastSyncError: null,
        },
      });

      return created.id;
    });

    return { success: true, appointmentId };
  } catch (error) {
    if (error instanceof Error && error.message === "OVERLAP") {
      return { error: "That time is no longer available. Please choose another slot." };
    }
    return {
      error: "Unable to complete booking. Please try another time or contact us.",
    };
  }
}

export async function loadPublicSlotOptions() {
  const settings = await getDiscoveryAvailabilitySettings();
  const connection = await getActiveGoogleCalendarConnection();
  if (!settings || !connection?.calendarId) {
    return [];
  }

  const { slotInput } = await buildSlotGeneratorContext(settings, connection);
  return generateAvailabilitySlots(slotInput);
}
