import { describe, expect, it } from "vitest";
import { toGoogleCalendarEventDateTime } from "@/lib/google-calendar/datetime";

describe("toGoogleCalendarEventDateTime", () => {
  const timezone = "America/Los_Angeles";

  it("converts 9:00 AM PDT to a local datetime without Z suffix", () => {
    const utc = new Date("2026-05-28T16:00:00.000Z");
    const result = toGoogleCalendarEventDateTime(utc, timezone);

    expect(result).toEqual({
      dateTime: "2026-05-28T09:00:00",
      timeZone: timezone,
    });
    expect(result.dateTime).not.toMatch(/Z$/);
  });

  it("converts 4:00 PM PDT to a local datetime without Z suffix", () => {
    const utc = new Date("2026-05-28T23:00:00.000Z");
    const result = toGoogleCalendarEventDateTime(utc, timezone);

    expect(result).toEqual({
      dateTime: "2026-05-28T16:00:00",
      timeZone: timezone,
    });
    expect(result.dateTime).not.toMatch(/Z$/);
  });
});
