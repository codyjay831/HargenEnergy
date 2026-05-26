import {
  addDays,
  addHours,
  addMinutes,
  format,
  getDay,
  parse,
  startOfDay,
} from "date-fns";
import { toZonedTime, fromZonedTime } from "date-fns-tz";
import { blockedRangeOverlapsAny } from "@/lib/discovery-scheduling/overlap";
import type {
  AvailabilitySlot,
  BusyInterval,
  TimeWindow,
  WeekdayKey,
  WeekdayWindows,
} from "@/lib/discovery-scheduling/types";

const WEEKDAY_KEYS: WeekdayKey[] = [
  "sun",
  "mon",
  "tue",
  "wed",
  "thu",
  "fri",
  "sat",
];

export type SlotGeneratorInput = {
  timezone: string;
  slotDurationMinutes: number;
  bufferBeforeMinutes: number;
  bufferAfterMinutes: number;
  minimumNoticeHours: number;
  bookingWindowDays: number;
  weekdayWindows: WeekdayWindows;
  blackoutDates: string[];
  busyBlocksUtc: BusyInterval[];
  existingAppointments: BusyInterval[];
  now?: Date;
};

function weekdayKeyForDate(date: Date, timezone: string): WeekdayKey {
  const zoned = toZonedTime(date, timezone);
  return WEEKDAY_KEYS[getDay(zoned)];
}

function parseLocalTimeOnDay(
  dayStartLocal: Date,
  time: string,
  timezone: string,
): Date {
  const dayStr = format(dayStartLocal, "yyyy-MM-dd");
  const local = parse(`${dayStr} ${time}`, "yyyy-MM-dd HH:mm", dayStartLocal);
  return fromZonedTime(local, timezone);
}

function isBlackoutDate(date: Date, timezone: string, blackoutDates: string[]): boolean {
  const zoned = toZonedTime(date, timezone);
  const key = format(zoned, "yyyy-MM-dd");
  return blackoutDates.includes(key);
}

export function generateAvailabilitySlots(
  input: SlotGeneratorInput,
): AvailabilitySlot[] {
  const now = input.now ?? new Date();
  const earliest = addHours(now, input.minimumNoticeHours);
  const latest = addDays(now, input.bookingWindowDays);
  const slots: AvailabilitySlot[] = [];

  let cursor = startOfDay(toZonedTime(now, input.timezone));
  const lastDay = startOfDay(toZonedTime(latest, input.timezone));

  while (cursor <= lastDay) {
    if (isBlackoutDate(cursor, input.timezone, input.blackoutDates)) {
      cursor = addDays(cursor, 1);
      continue;
    }

    const weekday = weekdayKeyForDate(cursor, input.timezone);
    const windows: TimeWindow[] = input.weekdayWindows[weekday] ?? [];

    for (const window of windows) {
      let slotStart = parseLocalTimeOnDay(cursor, window.start, input.timezone);
      const windowEnd = parseLocalTimeOnDay(cursor, window.end, input.timezone);

      while (addMinutes(slotStart, input.slotDurationMinutes) <= windowEnd) {
        const slotEnd = addMinutes(slotStart, input.slotDurationMinutes);

        if (slotStart >= earliest && slotStart <= latest) {
          const blockStart = addMinutes(slotStart, -input.bufferBeforeMinutes);
          const blockEnd = addMinutes(slotEnd, input.bufferAfterMinutes);
          const busy = [...input.busyBlocksUtc, ...input.existingAppointments];

          if (!blockedRangeOverlapsAny(blockStart, blockEnd, busy)) {
            slots.push({
              startUtc: slotStart,
              endUtc: slotEnd,
              displayTimezone: input.timezone,
            });
          }
        }

        slotStart = addMinutes(slotStart, input.slotDurationMinutes);
      }
    }

    cursor = addDays(cursor, 1);
  }

  return slots.sort((a, b) => a.startUtc.getTime() - b.startUtc.getTime());
}

export function isSlotStillAvailable(
  input: SlotGeneratorInput,
  slotStartUtc: Date,
): boolean {
  const slotEndUtc = addMinutes(slotStartUtc, input.slotDurationMinutes);
  const slots = generateAvailabilitySlots(input);
  return slots.some(
    (slot) =>
      slot.startUtc.getTime() === slotStartUtc.getTime() &&
      slot.endUtc.getTime() === slotEndUtc.getTime(),
  );
}
