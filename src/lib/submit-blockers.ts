import {
  AgreementStatus,
  ClientStatus,
  EngagementType,
} from "@/generated/prisma/client";
import {
  type BillingReadinessInput,
  isPaymentMadeForSubmit,
} from "@/lib/client-billing-readiness";
import { isAgreementSatisfied } from "@/lib/client-agreement";
import type { SetupSheetKey } from "@/lib/setup-sheet-keys";
import type { PortalSubmitBlockReason } from "@/lib/portal-submit-eligibility";
import type { ServiceModelTypeValue } from "@/lib/client-service-model";

export type SubmitBlockerDomain =
  | "lifecycle"
  | "agreement"
  | "scope"
  | "billing"
  | "catalog";

export type SubmitBlockerActionTarget =
  | SetupSheetKey
  | "activation"
  | "agreement";

export type SubmitBlocker = {
  reasonCode: PortalSubmitBlockReason;
  domain: SubmitBlockerDomain;
  portalMessage: string;
  adminMessage: string;
  actionTarget: SubmitBlockerActionTarget;
};

export type SubmitBlockerSummary = {
  canSubmit: boolean;
  primary?: SubmitBlocker;
  all: SubmitBlocker[];
  blockersByDomain: Record<SubmitBlockerDomain, boolean>;
};

export type SubmitBlockerInput = BillingReadinessInput & {
  status: ClientStatus;
  agreementStatus: AgreementStatus;
  activeServiceModels?: ServiceModelTypeValue[];
  approvedWorkTaskCount: number;
  activeCatalogTaskCount: number;
};

/** Deterministic gate order — first match is primary submit blocker. */
export const SUBMIT_BLOCKER_PRIORITY: PortalSubmitBlockReason[] = [
  "not_active",
  "agreement_pending",
  "scope_not_configured",
  "no_catalog_tasks",
  "payment_not_made",
];

const BLOCKER_COPY: Record<
  PortalSubmitBlockReason,
  { portalMessage: string; adminMessage: string; domain: SubmitBlockerDomain; actionTarget: SubmitBlockerActionTarget }
> = {
  not_active: {
    domain: "lifecycle",
    portalMessage: "Your account is being activated by Hargen.",
    adminMessage: "Activate the client before portal invite or portal work submission.",
    actionTarget: "activation",
  },
  agreement_pending: {
    domain: "agreement",
    portalMessage:
      "Your service agreement is being finalized. Hargen will notify you when you can send work.",
    adminMessage:
      "Service agreement is not signed. Mark agreement as sent or signed before work can proceed.",
    actionTarget: "agreement",
  },
  scope_not_configured: {
    domain: "scope",
    portalMessage: "Your approved support areas are being configured.",
    adminMessage: "Configure approved support work before customers can submit work.",
    actionTarget: "engagement",
  },
  no_catalog_tasks: {
    domain: "catalog",
    portalMessage: "No work types are available right now.",
    adminMessage: "No active work types are available. Configure the catalog before Request-Based work.",
    actionTarget: "engagement",
  },
  payment_not_made: {
    domain: "billing",
    portalMessage: "Complete payment setup to send your first request.",
    adminMessage: "Payment setup is incomplete. Resolve billing before starting or logging work.",
    actionTarget: "billing",
  },
};

export function getSubmitBlockerCopy(
  reasonCode: PortalSubmitBlockReason,
  audience: "portal" | "admin",
): string {
  const copy = BLOCKER_COPY[reasonCode];
  return audience === "portal" ? copy.portalMessage : copy.adminMessage;
}

export function getSubmitBlockerActionTarget(
  reasonCode: PortalSubmitBlockReason,
): SubmitBlockerActionTarget {
  return BLOCKER_COPY[reasonCode].actionTarget;
}

function makeBlocker(reasonCode: PortalSubmitBlockReason): SubmitBlocker {
  const copy = BLOCKER_COPY[reasonCode];
  return {
    reasonCode,
    domain: copy.domain,
    portalMessage: copy.portalMessage,
    adminMessage: copy.adminMessage,
    actionTarget: copy.actionTarget,
  };
}

export function collectSubmitBlockers(input: SubmitBlockerInput): SubmitBlocker[] {
  const blockers: SubmitBlocker[] = [];
  const globalBlockers: SubmitBlocker[] = [];

  const activeModels = Array.from(
    new Set(
      input.activeServiceModels && input.activeServiceModels.length > 0
        ? input.activeServiceModels
        : [input.engagementType as unknown as ServiceModelTypeValue],
    ),
  );
  const hasSupportBlock = activeModels.includes("SUPPORT_BLOCK");
  const hasRequestBased = activeModels.includes("REQUEST_BASED");

  if (input.status !== ClientStatus.ACTIVE) {
    globalBlockers.push(makeBlocker("not_active"));
  }

  if (!isAgreementSatisfied(input.agreementStatus)) {
    globalBlockers.push(makeBlocker("agreement_pending"));
  }

  if (globalBlockers.length > 0) {
    return globalBlockers;
  }

  const requestBasedReady = hasRequestBased && input.activeCatalogTaskCount > 0;

  let supportBlockReady = false;
  const supportBlockModeBlockers: SubmitBlocker[] = [];
  if (hasSupportBlock) {
    const scopeReady = input.approvedWorkTaskCount > 0;
    if (!scopeReady) {
      supportBlockModeBlockers.push(makeBlocker("scope_not_configured"));
    }

    const billingInput: BillingReadinessInput = {
      engagementType: EngagementType.SUPPORT_BLOCK,
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

    const paymentReady = isPaymentMadeForSubmit(billingInput);
    if (!paymentReady) {
      supportBlockModeBlockers.push(makeBlocker("payment_not_made"));
    }

    supportBlockReady = scopeReady && paymentReady;
  }

  if (requestBasedReady || supportBlockReady) {
    return [];
  }

  if (hasRequestBased && !requestBasedReady) {
    blockers.push(makeBlocker("no_catalog_tasks"));
  }
  if (hasSupportBlock) {
    blockers.push(...supportBlockModeBlockers);
  }

  return blockers;
}

export function deriveSubmitBlockerSummary(input: SubmitBlockerInput): SubmitBlockerSummary {
  const all = collectSubmitBlockers(input);
  const blockersByDomain: Record<SubmitBlockerDomain, boolean> = {
    lifecycle: false,
    agreement: false,
    scope: false,
    billing: false,
    catalog: false,
  };

  for (const blocker of all) {
    blockersByDomain[blocker.domain] = true;
  }

  const sorted = [...all].sort(
    (a, b) =>
      SUBMIT_BLOCKER_PRIORITY.indexOf(a.reasonCode) -
      SUBMIT_BLOCKER_PRIORITY.indexOf(b.reasonCode),
  );

  return {
    canSubmit: sorted.length === 0,
    primary: sorted[0],
    all: sorted,
    blockersByDomain,
  };
}
