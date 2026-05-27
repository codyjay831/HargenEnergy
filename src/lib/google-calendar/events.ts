import "server-only";

import { getGoogleCalendarClient } from "@/lib/google-calendar/client";
import { toGoogleCalendarEventDateTime } from "@/lib/google-calendar/datetime";
import type { GoogleCalendarEventResult } from "@/lib/google-calendar/types";

type CreateDiscoveryEventInput = {
  connectionId: string;
  calendarId: string;
  summary: string;
  description: string;
  startUtc: Date;
  endUtc: Date;
  timezone: string;
  attendeeEmail: string;
  attendeeName: string;
  phone?: string | null;
  useMeet: boolean;
  fallbackMeetingUrl?: string | null;
};

function extractMeetUrl(event: {
  conferenceData?: { entryPoints?: Array<{ entryPointType?: string | null; uri?: string | null }> | null } | null;
  hangoutLink?: string | null;
}): string | null {
  const meetEntry = event.conferenceData?.entryPoints?.find(
    (entry) => entry.entryPointType === "video",
  );
  return meetEntry?.uri ?? event.hangoutLink ?? null;
}

export async function createDiscoveryCalendarEvent(
  input: CreateDiscoveryEventInput,
): Promise<GoogleCalendarEventResult> {
  const calendar = await getGoogleCalendarClient(input.connectionId);
  const requestId = `discovery-${Date.now()}`;

  const descriptionParts = [input.description];
  if (input.phone?.trim()) {
    descriptionParts.push(`Phone: ${input.phone.trim()}`);
  }

  const baseEvent = {
    summary: input.summary,
    description: descriptionParts.join("\n\n"),
    start: toGoogleCalendarEventDateTime(input.startUtc, input.timezone),
    end: toGoogleCalendarEventDateTime(input.endUtc, input.timezone),
    attendees: [{ email: input.attendeeEmail, displayName: input.attendeeName }],
  };

  if (input.useMeet) {
    try {
      const withMeet = await calendar.events.insert({
        calendarId: input.calendarId,
        conferenceDataVersion: 1,
        sendUpdates: "none",
        requestBody: {
          ...baseEvent,
          conferenceData: {
            createRequest: {
              requestId,
              conferenceSolutionKey: { type: "hangoutsMeet" },
            },
          },
        },
      });

      const meetingUrl = extractMeetUrl(withMeet.data);
      if (!meetingUrl) {
        throw new Error("Google Meet link was not returned.");
      }

      return {
        eventId: withMeet.data.id!,
        htmlLink: withMeet.data.htmlLink ?? null,
        meetingUrl,
        meetingType: "Google Meet",
      };
    } catch (error) {
      if (!input.fallbackMeetingUrl?.trim()) {
        throw error;
      }
    }
  }

  const fallbackUrl = input.fallbackMeetingUrl?.trim();
  if (!fallbackUrl) {
    throw new Error("No meeting URL available for calendar event.");
  }

  const fallbackEvent = await calendar.events.insert({
    calendarId: input.calendarId,
    sendUpdates: "none",
    requestBody: {
      ...baseEvent,
      location: fallbackUrl,
      description: `${descriptionParts.join("\n\n")}\n\nMeeting link: ${fallbackUrl}`,
    },
  });

  return {
    eventId: fallbackEvent.data.id!,
    htmlLink: fallbackEvent.data.htmlLink ?? null,
    meetingUrl: fallbackUrl,
    meetingType: "Google Meet",
  };
}

export async function updateDiscoveryCalendarEvent(input: {
  connectionId: string;
  calendarId: string;
  eventId: string;
  startUtc: Date;
  endUtc: Date;
  timezone: string;
}) {
  const calendar = await getGoogleCalendarClient(input.connectionId);
  await calendar.events.patch({
    calendarId: input.calendarId,
    eventId: input.eventId,
    sendUpdates: "none",
    requestBody: {
      start: toGoogleCalendarEventDateTime(input.startUtc, input.timezone),
      end: toGoogleCalendarEventDateTime(input.endUtc, input.timezone),
    },
  });
}

export async function cancelDiscoveryCalendarEvent(input: {
  connectionId: string;
  calendarId: string;
  eventId: string;
}) {
  const calendar = await getGoogleCalendarClient(input.connectionId);
  await calendar.events.delete({
    calendarId: input.calendarId,
    eventId: input.eventId,
    sendUpdates: "none",
  });
}

export async function listGoogleCalendars(connectionId: string) {
  const calendar = await getGoogleCalendarClient(connectionId);
  const response = await calendar.calendarList.list();
  return (response.data.items ?? [])
    .filter((item) => item.id && item.summary)
    .map((item) => ({
      id: item.id!,
      summary: item.summary!,
      primary: Boolean(item.primary),
    }));
}
