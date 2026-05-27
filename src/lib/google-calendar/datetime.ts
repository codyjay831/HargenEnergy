import { formatInTimeZone } from "date-fns-tz";

export function toGoogleCalendarEventDateTime(utc: Date, timezone: string) {
  return {
    dateTime: formatInTimeZone(utc, timezone, "yyyy-MM-dd'T'HH:mm:ss"),
    timeZone: timezone,
  };
}
