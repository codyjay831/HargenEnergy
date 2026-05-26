import { describe, expect, it } from "vitest";
import { intervalsOverlap } from "@/lib/walkthrough-scheduling/overlap";

describe("intervalsOverlap", () => {
  it("detects partial overlap", () => {
    const aStart = new Date("2026-06-01T10:00:00Z");
    const aEnd = new Date("2026-06-01T11:00:00Z");
    const bStart = new Date("2026-06-01T10:30:00Z");
    const bEnd = new Date("2026-06-01T11:30:00Z");
    expect(intervalsOverlap(aStart, aEnd, bStart, bEnd)).toBe(true);
  });

  it("returns false for adjacent non-overlapping intervals", () => {
    const aStart = new Date("2026-06-01T10:00:00Z");
    const aEnd = new Date("2026-06-01T11:00:00Z");
    const bStart = new Date("2026-06-01T11:00:00Z");
    const bEnd = new Date("2026-06-01T12:00:00Z");
    expect(intervalsOverlap(aStart, aEnd, bStart, bEnd)).toBe(false);
  });
});
