import { describe, it, expect } from "vitest";
import { BillableType } from "@/generated/prisma/client";
import { calculateWeeklyUsage } from "@/lib/usage";

function entry(minutes: number, billableType: BillableType = BillableType.INCLUDED) {
  return {
    date: new Date(),
    minutes,
    billableType,
  } as Parameters<typeof calculateWeeklyUsage>[0][number];
}

describe("calculateWeeklyUsage", () => {
  it("does not mark over limit when no weekly capacity is configured", () => {
    const usage = calculateWeeklyUsage([entry(54)], 0);
    expect(usage.includedMinutesThisWeek).toBe(54);
    expect(usage.weeklyReservedMinutes).toBe(0);
    expect(usage.isOverLimit).toBe(false);
  });

  it("marks over limit when included time exceeds reserved hours", () => {
    const usage = calculateWeeklyUsage([entry(180)], 2);
    expect(usage.includedMinutesThisWeek).toBe(180);
    expect(usage.weeklyReservedMinutes).toBe(120);
    expect(usage.isOverLimit).toBe(true);
  });

  it("does not mark over limit when within reserved hours", () => {
    const usage = calculateWeeklyUsage([entry(60)], 2);
    expect(usage.isOverLimit).toBe(false);
    expect(usage.percentUsed).toBe(50);
  });
});
