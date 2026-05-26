import { describe, expect, it } from "vitest";
import { formatInTimeZone } from "date-fns-tz";
import { generateAvailabilitySlots } from "@/lib/discovery-scheduling/slot-generator";
import type { WeekdayWindows } from "@/lib/discovery-scheduling/types";

const weekdayWindows: WeekdayWindows = {
  mon: [{ start: "09:00", end: "12:00" }],
  tue: [],
  wed: [],
  thu: [],
  fri: [],
  sat: [],
  sun: [],
};

describe("generateAvailabilitySlots", () => {
  it("returns slots within weekday windows respecting minimum notice", () => {
    const now = new Date("2026-05-25T16:00:00.000Z");
    const slots = generateAvailabilitySlots({
      timezone: "America/Los_Angeles",
      slotDurationMinutes: 30,
      bufferBeforeMinutes: 0,
      bufferAfterMinutes: 0,
      minimumNoticeHours: 24,
      bookingWindowDays: 7,
      weekdayWindows,
      blackoutDates: [],
      busyBlocksUtc: [],
      existingAppointments: [],
      now,
    });

    expect(slots.length).toBeGreaterThan(0);
    for (const slot of slots) {
      expect(slot.startUtc.getTime()).toBeGreaterThanOrEqual(
        now.getTime() + 24 * 60 * 60 * 1000 - 1000,
      );
    }
  });

  it("excludes blackout dates", () => {
    const now = new Date("2026-05-25T16:00:00.000Z");
    const timezone = "America/Los_Angeles";
    const baseInput = {
      timezone,
      slotDurationMinutes: 30,
      bufferBeforeMinutes: 0,
      bufferAfterMinutes: 0,
      minimumNoticeHours: 0,
      bookingWindowDays: 3,
      weekdayWindows: {
        ...weekdayWindows,
        mon: [{ start: "09:00", end: "17:00" }],
      },
      busyBlocksUtc: [] as { start: Date; end: Date }[],
      existingAppointments: [] as { start: Date; end: Date }[],
      now,
    };

    const withoutBlackout = generateAvailabilitySlots({
      ...baseInput,
      blackoutDates: [],
    });
    const withBlackout = generateAvailabilitySlots({
      ...baseInput,
      blackoutDates: ["2026-05-25"],
    });

    expect(withBlackout.length).toBeLessThan(withoutBlackout.length);
    expect(
      withBlackout.every(
        (slot) =>
          formatInTimeZone(slot.startUtc, timezone, "yyyy-MM-dd") !== "2026-05-25",
      ),
    ).toBe(true);
  });

  it("skips slots overlapping busy intervals with buffers", () => {
    const now = new Date("2026-05-25T16:00:00.000Z");
    const busyStart = new Date("2026-05-26T16:00:00.000Z");
    const busyEnd = new Date("2026-05-26T17:00:00.000Z");

    const withoutBusy = generateAvailabilitySlots({
      timezone: "UTC",
      slotDurationMinutes: 30,
      bufferBeforeMinutes: 0,
      bufferAfterMinutes: 0,
      minimumNoticeHours: 0,
      bookingWindowDays: 2,
      weekdayWindows: {
        mon: [{ start: "00:00", end: "23:59" }],
        tue: [{ start: "00:00", end: "23:59" }],
        wed: [],
        thu: [],
        fri: [],
        sat: [],
        sun: [],
      },
      blackoutDates: [],
      busyBlocksUtc: [],
      existingAppointments: [],
      now,
    });

    const withBusy = generateAvailabilitySlots({
      timezone: "UTC",
      slotDurationMinutes: 30,
      bufferBeforeMinutes: 15,
      bufferAfterMinutes: 15,
      minimumNoticeHours: 0,
      bookingWindowDays: 2,
      weekdayWindows: {
        mon: [{ start: "00:00", end: "23:59" }],
        tue: [{ start: "00:00", end: "23:59" }],
        wed: [],
        thu: [],
        fri: [],
        sat: [],
        sun: [],
      },
      blackoutDates: [],
      busyBlocksUtc: [{ start: busyStart, end: busyEnd }],
      existingAppointments: [],
      now,
    });

    expect(withBusy.length).toBeLessThan(withoutBusy.length);
  });
});
