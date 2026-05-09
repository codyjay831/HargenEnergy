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
