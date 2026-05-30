import { PlanType } from "@/generated/prisma/client";

import {
  SUPPORT_PLAN_TIERS,
  SUPPORT_PLAN_WEEKLY_HOURS_BY_TIER,
  type SupportPlanTier,
} from "@/lib/support-plan-hours-constants";

export { SUPPORT_PLAN_TIERS, SUPPORT_PLAN_WEEKLY_HOURS_BY_TIER, type SupportPlanTier };

export const SUPPORT_PLAN_WEEKLY_HOURS: Record<PlanType, number> = {
  [PlanType.LIGHT]: SUPPORT_PLAN_WEEKLY_HOURS_BY_TIER.LIGHT,
  [PlanType.CORE]: SUPPORT_PLAN_WEEKLY_HOURS_BY_TIER.CORE,
  [PlanType.PRIORITY]: SUPPORT_PLAN_WEEKLY_HOURS_BY_TIER.PRIORITY,
  [PlanType.CUSTOM]: 0,
};

export function getWeeklyHoursForPlanType(planType: PlanType): number {
  return SUPPORT_PLAN_WEEKLY_HOURS[planType] ?? 0;
}

export function parseSupportPlanType(raw: string | null | undefined): PlanType | null {
  if (!raw?.trim()) return null;
  const normalized = raw.trim().toUpperCase();
  if (SUPPORT_PLAN_TIERS.includes(normalized as SupportPlanTier)) {
    return normalized as PlanType;
  }
  return null;
}
