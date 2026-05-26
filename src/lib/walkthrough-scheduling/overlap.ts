import type { BusyInterval } from "@/lib/walkthrough-scheduling/types";

export function intervalsOverlap(
  aStart: Date,
  aEnd: Date,
  bStart: Date,
  bEnd: Date,
): boolean {
  return aStart < bEnd && bStart < aEnd;
}

export function blockedRangeOverlapsAny(
  blockStart: Date,
  blockEnd: Date,
  intervals: BusyInterval[],
): boolean {
  return intervals.some((interval) =>
    intervalsOverlap(blockStart, blockEnd, interval.start, interval.end),
  );
}
