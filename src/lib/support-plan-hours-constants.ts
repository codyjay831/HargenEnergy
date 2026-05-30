/**
 * Browser-safe weekly hours per support tier.
 * Keep in sync with server mapping in support-plan-hours.ts (CUSTOM = 0).
 */
export const SUPPORT_PLAN_WEEKLY_HOURS_BY_TIER = {
  LIGHT: 2,
  CORE: 5,
  PRIORITY: 10,
} as const;

export type SupportPlanTier = keyof typeof SUPPORT_PLAN_WEEKLY_HOURS_BY_TIER;

export const SUPPORT_PLAN_TIERS = ["LIGHT", "CORE", "PRIORITY"] as const satisfies readonly SupportPlanTier[];
