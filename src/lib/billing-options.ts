/**
 * Browser-safe support plan options (mirrors Prisma `PlanType` checkout subset).
 * Do not import `@prisma/client` from Client Components — use this instead.
 */
export const SUPPORT_PLANS = [
  { value: "LIGHT", label: "Light Operations Support", weeklyHours: 2 },
  { value: "CORE", label: "Steady Operations Support", weeklyHours: 5 },
  { value: "PRIORITY", label: "Heavy Operations Support", weeklyHours: 10 },
] as const;

export type SupportPlanType = (typeof SUPPORT_PLANS)[number]["value"];

/** Full `PlanType` string union as returned from the DB / server components */
export type ClientPlanType = SupportPlanType | "CUSTOM";
