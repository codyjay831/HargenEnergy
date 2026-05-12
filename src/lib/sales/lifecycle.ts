/**
 * Sales Domain: Qualification and Onboarding
 * 
 * Business logic for pre-sale walkthrough requests and prospect qualification.
 */

import { RequestStatus, SupportRequestKind } from "@/lib/enums";

// Sales-flavored status transitions for PROSPECT_INTAKE
const QUALIFICATION_TRANSITIONS: Record<RequestStatus, RequestStatus[]> = {
  [RequestStatus.NEW]: [RequestStatus.REVIEWED, RequestStatus.CANCELLED],
  [RequestStatus.REVIEWED]: [RequestStatus.IN_PROGRESS, RequestStatus.COMPLETE, RequestStatus.CANCELLED],
  [RequestStatus.IN_PROGRESS]: [RequestStatus.REVIEWED, RequestStatus.COMPLETE, RequestStatus.CANCELLED],
  [RequestStatus.COMPLETE]: [RequestStatus.IN_PROGRESS], // Allow reopening if needed
  [RequestStatus.CANCELLED]: [RequestStatus.REVIEWED], // Allow re-engaging
  [RequestStatus.NEEDS_INFO]: [RequestStatus.REVIEWED, RequestStatus.IN_PROGRESS], // Not primary for sales
  [RequestStatus.WAITING_ON_CUSTOMER]: [RequestStatus.REVIEWED, RequestStatus.IN_PROGRESS],
  [RequestStatus.WAITING_ON_THIRD_PARTY]: [RequestStatus.REVIEWED, RequestStatus.IN_PROGRESS],
};

// Human-readable qualification stage labels
export const QUALIFICATION_STATUS_LABELS: Record<RequestStatus, string> = {
  [RequestStatus.NEW]: "Needs review",
  [RequestStatus.REVIEWED]: "In conversation",
  [RequestStatus.IN_PROGRESS]: "Evaluating fit",
  [RequestStatus.COMPLETE]: "Closed - won",
  [RequestStatus.CANCELLED]: "Not a fit",
  [RequestStatus.NEEDS_INFO]: "Awaiting response",
  [RequestStatus.WAITING_ON_CUSTOMER]: "Waiting on customer",
  [RequestStatus.WAITING_ON_THIRD_PARTY]: "Waiting on third party",
};

export function isProspectIntake(kind: SupportRequestKind): boolean {
  return kind === SupportRequestKind.PROSPECT_INTAKE;
}

export function canTransitionQualificationStatus(
  currentStatus: RequestStatus,
  newStatus: RequestStatus
): boolean {
  const allowed = QUALIFICATION_TRANSITIONS[currentStatus] || [];
  return allowed.includes(newStatus);
}

export function getQualificationStatusLabel(status: RequestStatus): string {
  return QUALIFICATION_STATUS_LABELS[status] || status.replace(/_/g, " ");
}

// Validation: Walkthrough requests must be non-billable
export function assertNonBillableForIntake(kind: SupportRequestKind, billableType: string): { error: string } | null {
  if (kind === SupportRequestKind.PROSPECT_INTAKE && billableType !== "NON_BILLABLE") {
    return {
      error: "Walkthrough and discovery time must be non-billable. Billable tracking starts after client activation.",
    };
  }
  return null;
}
