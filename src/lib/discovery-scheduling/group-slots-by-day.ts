import { formatInTimeZone } from "date-fns-tz";

export type DiscoverySlotLike = {
  startUtc: string;
  endUtc: string;
  displayTimezone: string;
};

export type DiscoveryDayGroup = {
  dayKey: string;
  monthKey: string;
  monthLabel: string;
  label: string;
  shortLabel: string;
  slots: DiscoverySlotLike[];
};

export function getSlotDayKey(slot: DiscoverySlotLike): string {
  return formatInTimeZone(new Date(slot.startUtc), slot.displayTimezone, "yyyy-MM-dd");
}

export function groupDiscoverySlotsByDay<T extends DiscoverySlotLike>(
  slots: T[],
): DiscoveryDayGroup[] {
  const byDay = new Map<string, T[]>();

  for (const slot of slots) {
    const dayKey = getSlotDayKey(slot);
    const existing = byDay.get(dayKey);
    if (existing) {
      existing.push(slot);
    } else {
      byDay.set(dayKey, [slot]);
    }
  }

  const groups: DiscoveryDayGroup[] = [];

  for (const [dayKey, daySlots] of byDay) {
    if (daySlots.length === 0) continue;

    const sorted = [...daySlots].sort(
      (a, b) => new Date(a.startUtc).getTime() - new Date(b.startUtc).getTime(),
    );
    const tz = sorted[0].displayTimezone;
    const anchor = new Date(sorted[0].startUtc);

    groups.push({
      dayKey,
      monthKey: formatInTimeZone(anchor, tz, "yyyy-MM"),
      monthLabel: formatInTimeZone(anchor, tz, "MMMM yyyy"),
      label: formatInTimeZone(anchor, tz, "EEEE, MMM d"),
      shortLabel: formatInTimeZone(anchor, tz, "EEE d"),
      slots: sorted,
    });
  }

  return groups.sort((a, b) => a.dayKey.localeCompare(b.dayKey));
}

export function groupDiscoveryDayGroupsByMonth(
  dayGroups: DiscoveryDayGroup[],
): { monthKey: string; monthLabel: string; days: DiscoveryDayGroup[] }[] {
  const byMonth = new Map<string, DiscoveryDayGroup[]>();

  for (const day of dayGroups) {
    const existing = byMonth.get(day.monthKey);
    if (existing) {
      existing.push(day);
    } else {
      byMonth.set(day.monthKey, [day]);
    }
  }

  return [...byMonth.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([monthKey, days]) => ({
      monthKey,
      monthLabel: days[0]?.monthLabel ?? monthKey,
      days,
    }));
}
