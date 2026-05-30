/**
 * Browser-safe support plan options (mirrors Prisma `PlanType` checkout subset).
 * Do not import `@prisma/client` from Client Components — use this instead.
 */
import { SUPPORT_PLAN_WEEKLY_HOURS_BY_TIER } from "@/lib/support-plan-hours-constants";

export const SUPPORT_PLANS = [
  {
    value: "LIGHT",
    label: "Light Operations Support",
    weeklyHours: SUPPORT_PLAN_WEEKLY_HOURS_BY_TIER.LIGHT,
  },
  {
    value: "CORE",
    label: "Steady Operations Support",
    weeklyHours: SUPPORT_PLAN_WEEKLY_HOURS_BY_TIER.CORE,
  },
  {
    value: "PRIORITY",
    label: "Heavy Operations Support",
    weeklyHours: SUPPORT_PLAN_WEEKLY_HOURS_BY_TIER.PRIORITY,
  },
] as const;

export type SupportPlanType = (typeof SUPPORT_PLANS)[number]["value"];

/** Full `PlanType` string union as returned from the DB / server components */
export type ClientPlanType = SupportPlanType | "CUSTOM";
