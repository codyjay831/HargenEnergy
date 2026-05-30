import { describe, it, expect } from "vitest";
import { PlanType } from "@/generated/prisma/client";
import {
  getWeeklyHoursForPlanType,
  parseSupportPlanType,
  SUPPORT_PLAN_WEEKLY_HOURS,
} from "@/lib/support-plan-hours";

describe("getWeeklyHoursForPlanType", () => {
  it("maps tier plans to weekly hours", () => {
    expect(getWeeklyHoursForPlanType(PlanType.LIGHT)).toBe(2);
    expect(getWeeklyHoursForPlanType(PlanType.CORE)).toBe(5);
    expect(getWeeklyHoursForPlanType(PlanType.PRIORITY)).toBe(10);
    expect(getWeeklyHoursForPlanType(PlanType.CUSTOM)).toBe(0);
  });

  it("matches SUPPORT_PLAN_WEEKLY_HOURS record", () => {
    expect(SUPPORT_PLAN_WEEKLY_HOURS[PlanType.LIGHT]).toBe(2);
  });
});

describe("parseSupportPlanType", () => {
  it("accepts tier plan strings case-insensitively", () => {
    expect(parseSupportPlanType("light")).toBe(PlanType.LIGHT);
    expect(parseSupportPlanType("CORE")).toBe(PlanType.CORE);
    expect(parseSupportPlanType(" Priority ")).toBe(PlanType.PRIORITY);
  });

  it("rejects invalid or empty values", () => {
    expect(parseSupportPlanType("")).toBeNull();
    expect(parseSupportPlanType("CUSTOM")).toBeNull();
    expect(parseSupportPlanType("not-sure")).toBeNull();
  });
});
