export type WeekdayKey = "mon" | "tue" | "wed" | "thu" | "fri" | "sat" | "sun";

export type TimeWindow = { start: string; end: string };

export type WeekdayWindows = Record<WeekdayKey, TimeWindow[]>;

export type AvailabilitySlot = {
  startUtc: Date;
  endUtc: Date;
  displayTimezone: string;
};

export type BusyInterval = { start: Date; end: Date };
