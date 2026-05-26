export const WALKTHROUGH_SCHEDULING_LINK_TTL_DAYS = 14;

export const DEFAULT_WALKTHROUGH_TIMEZONE = "America/Los_Angeles";

export const DEFAULT_WEEKDAY_WINDOWS = {
  mon: [{ start: "09:00", end: "17:00" }],
  tue: [{ start: "09:00", end: "17:00" }],
  wed: [{ start: "09:00", end: "17:00" }],
  thu: [{ start: "09:00", end: "17:00" }],
  fri: [{ start: "09:00", end: "17:00" }],
  sat: [] as { start: string; end: string }[],
  sun: [] as { start: string; end: string }[],
};

export const GOOGLE_CALENDAR_SCOPE =
  "https://www.googleapis.com/auth/calendar.events";

export function isWalkthroughSchedulingEnabled(): boolean {
  return process.env.WALKTHROUGH_SCHEDULING_ENABLED === "true";
}
