import {
  ClientStatus,
  EngagementType,
} from "@/generated/prisma/client";
import {
  type BillingReadinessInput,
  isPaymentMadeForSubmit,
} from "@/lib/client-billing-readiness";

export type PortalSubmitBlockReason =
  | "not_active"
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

export type PortalSubmitEligibilityInput = BillingReadinessInput & {
  status: ClientStatus;
  approvedWorkTaskCount: number;
  activeCatalogTaskCount: number;
};

const NOT_ACTIVE_MESSAGE =
  "Your account is being activated by Hargen.";
const SCOPE_MESSAGE =
  "Your approved support areas are being configured.";
const PAYMENT_MESSAGE =
  "Complete payment setup to send your first request.";
const CATALOG_MESSAGE =
  "No work types are available right now.";

export function getPortalWorkSubmitEligibility(
  input: PortalSubmitEligibilityInput,
): PortalSubmitEligibility {
  if (input.status !== ClientStatus.ACTIVE) {
    return {
      canSubmit: false,
      reasonCode: "not_active",
      message: NOT_ACTIVE_MESSAGE,
    };
  }

  if (input.engagementType === EngagementType.REQUEST_BASED) {
    if (input.activeCatalogTaskCount <= 0) {
      return {
        canSubmit: false,
        reasonCode: "no_catalog_tasks",
        message: CATALOG_MESSAGE,
      };
    }
    return { canSubmit: true };
  }

  if (input.approvedWorkTaskCount <= 0) {
    return {
      canSubmit: false,
      reasonCode: "scope_not_configured",
      message: SCOPE_MESSAGE,
    };
  }

  const billingInput: BillingReadinessInput = {
    engagementType: input.engagementType,
    billingMode: input.billingMode,
    billingOverrideReason: input.billingOverrideReason,
    billingOverrideExpiresAt: input.billingOverrideExpiresAt,
    billingOverrideCreatedAt: input.billingOverrideCreatedAt,
    billingOverrideCreatedById: input.billingOverrideCreatedById,
    stripeCustomerId: input.stripeCustomerId,
    stripeSubscriptionId: input.stripeSubscriptionId,
    subscriptionStatus: input.subscriptionStatus,
    subscriptionCurrentPeriodEnd: input.subscriptionCurrentPeriodEnd,
  };

  if (!isPaymentMadeForSubmit(billingInput)) {
    return {
      canSubmit: false,
      reasonCode: "payment_not_made",
      message: PAYMENT_MESSAGE,
    };
  }

  return { canSubmit: true };
}

/** Support Block clients can request scope changes without payment/scope submit gates. */
export function canRequestScopeChange(input: { status: ClientStatus }): boolean {
  return input.status === ClientStatus.ACTIVE;
}
