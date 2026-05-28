import { ClientStatus } from "@/generated/prisma/client";
import {
  deriveSubmitBlockerSummary,
  getSubmitBlockerCopy,
  type SubmitBlockerInput,
} from "@/lib/submit-blockers";

export type PortalSubmitBlockReason =
  | "not_active"
  | "agreement_pending"
  | "scope_not_configured"
  | "payment_not_made"
  | "no_catalog_tasks";

export type PortalSubmitEligibility =
  | { canSubmit: true }
  | {
      canSubmit: false;
      reasonCode: PortalSubmitBlockReason;
      message: string;
    };

export type PortalSubmitEligibilityInput = SubmitBlockerInput;

export function getPortalWorkSubmitEligibility(
  input: PortalSubmitEligibilityInput,
): PortalSubmitEligibility {
  const summary = deriveSubmitBlockerSummary(input);

  if (summary.canSubmit || !summary.primary) {
    return { canSubmit: true };
  }

  return {
    canSubmit: false,
    reasonCode: summary.primary.reasonCode,
    message: summary.primary.portalMessage,
  };
}

export { getSubmitBlockerCopy, deriveSubmitBlockerSummary };

/** Support Block clients can request scope changes without payment/scope submit gates. */
export function canRequestScopeChange(input: { status: ClientStatus }): boolean {
  return input.status === ClientStatus.ACTIVE;
}
