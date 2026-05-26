/**
 * Delivery Domain: Client Operations
 * 
 * Business logic for post-activation work requests and service delivery.
 */

import { RequestStatus, SupportRequestKind, BillableType, ClientStatus } from "@/lib/enums";

// Ops-flavored status transitions for CLIENT_OPS
const OPS_TRANSITIONS: Record<RequestStatus, RequestStatus[]> = {
  [RequestStatus.NEW]: [RequestStatus.IN_PROGRESS, RequestStatus.NEEDS_INFO, RequestStatus.CANCELLED],
  [RequestStatus.IN_PROGRESS]: [RequestStatus.COMPLETE, RequestStatus.NEEDS_INFO, RequestStatus.CANCELLED],
  [RequestStatus.NEEDS_INFO]: [RequestStatus.IN_PROGRESS, RequestStatus.CANCELLED],
  [RequestStatus.COMPLETE]: [RequestStatus.IN_PROGRESS], // Allow reopening
  [RequestStatus.REVIEWED]: [RequestStatus.IN_PROGRESS, RequestStatus.CANCELLED], // Edge case
  [RequestStatus.CANCELLED]: [RequestStatus.IN_PROGRESS], // Allow reopening
  [RequestStatus.WAITING_ON_CUSTOMER]: [RequestStatus.IN_PROGRESS, RequestStatus.CANCELLED],
  [RequestStatus.WAITING_ON_THIRD_PARTY]: [RequestStatus.IN_PROGRESS, RequestStatus.CANCELLED],
};

// Human-readable work request status labels
export const OPS_STATUS_LABELS: Record<RequestStatus, string> = {
  [RequestStatus.NEW]: "New",
  [RequestStatus.IN_PROGRESS]: "In progress",
  [RequestStatus.NEEDS_INFO]: "Needs info",
  [RequestStatus.COMPLETE]: "Complete",
  [RequestStatus.CANCELLED]: "Cancelled",
  [RequestStatus.REVIEWED]: "Reviewed", // Not primary for ops
  [RequestStatus.WAITING_ON_CUSTOMER]: "Waiting on customer",
  [RequestStatus.WAITING_ON_THIRD_PARTY]: "Waiting on third party",
};

export function isClientOps(kind: SupportRequestKind): boolean {
  return kind === SupportRequestKind.CLIENT_OPS;
}

export function canTransitionOpsStatus(
  currentStatus: RequestStatus,
  newStatus: RequestStatus
): boolean {
  const allowed = OPS_TRANSITIONS[currentStatus] || [];
  return allowed.includes(newStatus);
}

export function getOpsStatusLabel(status: RequestStatus): string {
  return OPS_STATUS_LABELS[status] || status.replace(/_/g, " ");
}

// Validation: Portal submission requires ACTIVE client
export function assertActiveClientForPortalSubmit(clientStatus: ClientStatus): { error: string } | null {
  if (clientStatus !== ClientStatus.ACTIVE) {
    return {
      error: "Portal work request submission is only available for active clients. Complete onboarding first.",
    };
  }
  return null;
}

// Validation: Portal invite only for ACTIVE clients
export function assertPortalInviteAllowed(clientStatus: ClientStatus): { error: string } | null {
  if (clientStatus !== ClientStatus.ACTIVE) {
    return {
      error: "Activate the client before sending a portal invite.",
    };
  }
  return null;
}

// Validation: Billable time can only be logged on CLIENT_OPS requests
export function assertBillableTimeOnRequest(
  requestKind: SupportRequestKind,
  billableType: BillableType
): { error: string } | null {
  if (
    requestKind === SupportRequestKind.PROSPECT_INTAKE &&
    billableType !== BillableType.NON_BILLABLE
  ) {
    return {
      error: "Billable or overflow time cannot be logged on discovery requests. Mark time as non-billable.",
    };
  }
  return null;
}
