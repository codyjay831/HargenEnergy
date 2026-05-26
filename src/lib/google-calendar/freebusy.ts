import "server-only";

import { getGoogleCalendarClient } from "@/lib/google-calendar/client";
import type { GoogleFreeBusyInterval } from "@/lib/google-calendar/types";

export async function fetchGoogleFreeBusy(
  connectionId: string,
  calendarId: string,
  timeMin: Date,
  timeMax: Date,
): Promise<GoogleFreeBusyInterval[]> {
  const calendar = await getGoogleCalendarClient(connectionId);
  const response = await calendar.freebusy.query({
    requestBody: {
      timeMin: timeMin.toISOString(),
      timeMax: timeMax.toISOString(),
      items: [{ id: calendarId }],
    },
  });

  const busy = response.data.calendars?.[calendarId]?.busy ?? [];
  return busy
    .filter((block) => block.start && block.end)
    .map((block) => ({
      start: new Date(block.start!),
      end: new Date(block.end!),
    }));
}
