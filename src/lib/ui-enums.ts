/**
 * Browser-safe mirrors of Prisma enums for Client Components.
 * Values must stay aligned with `prisma/schema.prisma`.
 */

export const URGENCY_VALUES = ["NORMAL", "THIS_WEEK", "URGENT", "ONGOING"] as const;
export type UrgencyValue = (typeof URGENCY_VALUES)[number];

export const URGENCY_OPTIONS: { value: UrgencyValue; label: string }[] = [
  { value: "NORMAL", label: "Normal support" },
  { value: "THIS_WEEK", label: "This week" },
  { value: "URGENT", label: "Urgent / Stuck job" },
  { value: "ONGOING", label: "Ongoing recurring support" },
];

export function isUrgencyValue(v: string): v is UrgencyValue {
  return (URGENCY_VALUES as readonly string[]).includes(v);
}

export const BILLABLE_TYPE_VALUES = ["INCLUDED", "OVERFLOW", "NON_BILLABLE"] as const;
export type BillableTypeValue = (typeof BILLABLE_TYPE_VALUES)[number];

export const BILLABLE_TYPES = {
  INCLUDED: "INCLUDED",
  OVERFLOW: "OVERFLOW",
  NON_BILLABLE: "NON_BILLABLE",
} as const satisfies Record<string, BillableTypeValue>;

export function isBillableTypeValue(v: string): v is BillableTypeValue {
  return (BILLABLE_TYPE_VALUES as readonly string[]).includes(v);
}

export const OVERFLOW_STATUS_VALUES = [
  "NOT_NEEDED",
  "NEEDS_APPROVAL",
  "APPROVED",
  "DECLINED",
  "DEFERRED",
] as const;
export type OverflowStatusValue = (typeof OVERFLOW_STATUS_VALUES)[number];

export const OVERFLOW_STATUSES = {
  NOT_NEEDED: "NOT_NEEDED",
  NEEDS_APPROVAL: "NEEDS_APPROVAL",
  APPROVED: "APPROVED",
  DECLINED: "DECLINED",
  DEFERRED: "DEFERRED",
} as const satisfies Record<string, OverflowStatusValue>;

export function isOverflowStatusValue(v: string): v is OverflowStatusValue {
  return (OVERFLOW_STATUS_VALUES as readonly string[]).includes(v);
}

export const REQUEST_STATUS_VALUES = [
  "NEW",
  "REVIEWED",
  "IN_PROGRESS",
  "NEEDS_INFO",
  "WAITING_ON_CUSTOMER",
  "WAITING_ON_THIRD_PARTY",
  "COMPLETE",
  "CANCELLED",
] as const;
export type RequestStatusValue = (typeof REQUEST_STATUS_VALUES)[number];

export function isRequestStatusValue(v: string): v is RequestStatusValue {
  return (REQUEST_STATUS_VALUES as readonly string[]).includes(v);
}

export const SUPPORT_REQUEST_SOURCE_VALUES = [
  "EMAIL",
  "PHONE",
  "TEXT",
  "VOICEMAIL",
  "ADMIN",
] as const;
export type SupportRequestSourceValue =
  (typeof SUPPORT_REQUEST_SOURCE_VALUES)[number];

export const SUPPORT_REQUEST_SOURCE_OPTIONS: {
  value: SupportRequestSourceValue;
  label: string;
}[] = [
  { value: "EMAIL", label: "Email" },
  { value: "PHONE", label: "Phone call" },
  { value: "TEXT", label: "Text message" },
  { value: "VOICEMAIL", label: "Voicemail" },
  { value: "ADMIN", label: "Other / admin" },
];

export function isSupportRequestSourceValue(
  v: string,
): v is SupportRequestSourceValue {
  return (SUPPORT_REQUEST_SOURCE_VALUES as readonly string[]).includes(v);
}

export const ENGAGEMENT_TYPE_VALUES = ["BLOCK_SUPPORT", "ONE_OFF"] as const;
export type EngagementTypeValue = (typeof ENGAGEMENT_TYPE_VALUES)[number];

export function isEngagementTypeValue(v: string): v is EngagementTypeValue {
  return (ENGAGEMENT_TYPE_VALUES as readonly string[]).includes(v);
}

export const HANDOFF_TIER_VALUES = ["CLEAN", "MESSY", "RECOVERY"] as const;
export type HandoffTierValue = (typeof HANDOFF_TIER_VALUES)[number];

export function isHandoffTierValue(v: string): v is HandoffTierValue {
  return (HANDOFF_TIER_VALUES as readonly string[]).includes(v);
}

export const PRICING_MODE_VALUES = [
  "FLAT",
  "HOURLY",
  "REVIEW_THEN_HOURLY",
] as const;
export type PricingModeValue = (typeof PRICING_MODE_VALUES)[number];

export function isPricingModeValue(v: string): v is PricingModeValue {
  return (PRICING_MODE_VALUES as readonly string[]).includes(v);
}

export const HANDOFF_TIER_OPTIONS: { value: HandoffTierValue; label: string }[] =
  [
    { value: "CLEAN", label: "Clean" },
    { value: "MESSY", label: "Messy" },
    { value: "RECOVERY", label: "Recovery" },
  ];

export const PRICING_MODE_OPTIONS: { value: PricingModeValue; label: string }[] =
  [
    { value: "FLAT", label: "Flat fee" },
    { value: "HOURLY", label: "Hourly" },
    { value: "REVIEW_THEN_HOURLY", label: "Review first, then hourly" },
  ];
