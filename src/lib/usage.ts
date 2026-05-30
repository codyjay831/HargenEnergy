import { startOfWeek, endOfWeek } from "date-fns";
import { BillableType, TimeEntry } from "@/generated/prisma/client";

export interface WeeklyUsage {
  includedMinutesThisWeek: number;
  overflowMinutesThisWeek: number;
  nonBillableMinutesThisWeek: number;
  totalTrackedMinutesThisWeek: number;
  weeklyReservedMinutes: number;
  remainingIncludedMinutes: number;
  percentUsed: number;
  isNearLimit: boolean;
  isOverLimit: boolean;
}

export function calculateWeeklyUsage(
  timeEntries: TimeEntry[],
  weeklyHours: number
): WeeklyUsage {
  const now = new Date();
  // Monday-start week
  const weekStart = startOfWeek(now, { weekStartsOn: 1 });
  const weekEnd = endOfWeek(now, { weekStartsOn: 1 });

  const weeklyEntries = timeEntries.filter((entry) => {
    const entryDate = new Date(entry.date);
    return entryDate >= weekStart && entryDate <= weekEnd;
  });

  const includedMinutes = weeklyEntries
    .filter((e) => e.billableType === BillableType.INCLUDED)
    .reduce((acc, curr) => acc + curr.minutes, 0);

  const overflowMinutes = weeklyEntries
    .filter((e) => e.billableType === BillableType.OVERFLOW)
    .reduce((acc, curr) => acc + curr.minutes, 0);

  const nonBillableMinutes = weeklyEntries
    .filter((e) => e.billableType === BillableType.NON_BILLABLE)
    .reduce((acc, curr) => acc + curr.minutes, 0);

  const weeklyReservedMinutes = weeklyHours * 60;
  const remainingIncluded = Math.max(0, weeklyReservedMinutes - includedMinutes);
  const percentUsed = weeklyReservedMinutes > 0 
    ? (includedMinutes / weeklyReservedMinutes) * 100 
    : 0;

  return {
    includedMinutesThisWeek: includedMinutes,
    overflowMinutesThisWeek: overflowMinutes,
    nonBillableMinutesThisWeek: nonBillableMinutes,
    totalTrackedMinutesThisWeek: includedMinutes + overflowMinutes + nonBillableMinutes,
    weeklyReservedMinutes,
    remainingIncludedMinutes: remainingIncluded,
    percentUsed,
    isNearLimit: percentUsed >= 80 && percentUsed <= 100,
    isOverLimit:
      weeklyReservedMinutes > 0 && includedMinutes > weeklyReservedMinutes,
  };
}
