/**
 * Request Lifecycle Helpers
 * 
 * Re-exports domain-specific helpers from sales and delivery modules.
 * This file provides backward compatibility while routing to the new domain structure.
 */

// Re-export from sales module
export {
  isProspectIntake,
  assertNonBillableForIntake,
  canTransitionQualificationStatus,
  getQualificationStatusLabel,
  QUALIFICATION_STATUS_LABELS,
} from "./sales/lifecycle";

// Re-export from delivery module
export {
  isClientOps,
  assertActiveClientForPortalSubmit,
  assertPortalInviteAllowed,
  assertBillableTimeOnRequest,
  canTransitionOpsStatus,
  getOpsStatusLabel,
  OPS_STATUS_LABELS,
} from "./delivery/lifecycle";

// Shared helpers
export function buildIntakeTitle(supportNeeded: string[]): string {
  const summary = supportNeeded.slice(0, 2).join(", ");
  return supportNeeded.length > 2 ? `${summary}...` : summary;
}

