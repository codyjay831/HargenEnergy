import {
  AgreementStatus,
  BillingMode,
  ClientStatus,
  EngagementType,
  PlanType,
  Role,
  SupportRequestKind,
  SystemAccessStatus,
  RequestStatus,
  DiscoveryFitDecision,
} from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";
import {
  type ClientBillingReadiness,
  getClientBillingReadiness,
} from "@/lib/client-billing-readiness";
import { getAdminBillingModeHeadline } from "@/lib/client-billing-mode";
import {
  ADMIN_STEP_SHEET,
  CUSTOMER_STEP_SHEET,
  enrichSetupSteps,
  type SetupSheetKey,
} from "@/lib/setup-sheet-keys";
import type { PortalSubmitBlockReason } from "@/lib/portal-submit-eligibility";
import {
  deriveSubmitBlockerSummary,
  type SubmitBlocker,
  type SubmitBlockerSummary,
} from "@/lib/submit-blockers";
import { adminClientTabHref } from "@/lib/admin-client-tabs";
import type { ServiceModelTypeValue } from "@/lib/client-service-model";
import {
  getClientAgreementReadiness,
  type AgreementReadiness,
} from "@/lib/client-agreement";
import { countPortalLoggedInUsers } from "@/lib/portal-user-login";
import { getClientCatalogEligibility } from "@/lib/client-catalog-eligibility";
import { loadCatalogTaskCounts } from "@/lib/client-catalog-loader";

export type SetupStepOwner = "admin" | "customer" | "system" | "stripe";
export type SetupStepStatus =
  | "complete"
  | "incomplete"
  | "blocked"
  | "not_required"
  | "attention";
export type SetupStepBlocker =
  | "blocks_invite"
  | "blocks_submit"
  | "blocks_billing"
  | "informational";

export type SetupStepInteractionMode = "sheet" | "navigate";

export type ClientSetupStep = {
  id: string;
  title: string;
  description?: string;
  owner: SetupStepOwner;
  status: SetupStepStatus;
  blockers: SetupStepBlocker[];
  required: boolean;
  actionLabel?: string;
  actionHref?: string;
  interactionMode?: SetupStepInteractionMode;
  sheetKey?: SetupSheetKey;
  adminOnly?: boolean;
  customerVisible?: boolean;
};

export type SystemAccessReadiness = {
  ready: boolean;
  status: "none_requested" | "needs_customer" | "in_review" | "partial" | "complete";
  total: number;
  notProvided: number;
  provided: number;
  verified: number;
  description: string;
};

export type ScopeReadiness = {
  required: boolean;
  ready: boolean;
  approvedWorkTaskCount: number;
  activeApprovedWorkTaskCount: number;
  activeCatalogTaskCount: number;
  description: string;
};

export type CatalogReadiness = {
  globalCatalogReady: boolean;
  discoveryCatalogReady: boolean;
  activeCatalogTaskCount: number;
  discoveryActiveTaskCount: number;
  description: string;
};

export type ClientSetupReadiness = {
  clientId: string;
  clientStatus: ClientStatus;
  engagementType: EngagementType;
  planType: PlanType;
  weeklyHours: number;
  canInvitePortal: boolean;
  canSubmitPortalWork: boolean;
  primarySubmitBlockReason?: PortalSubmitBlockReason;
  primarySubmitBlockMessage?: string;
  submitBlockers: SubmitBlockerSummary;
  allSubmitBlockers: SubmitBlocker[];
  agreementReady: boolean;
  agreement: AgreementReadiness;
  billingReady: boolean;
  systemAccessReady: boolean;
  portalAccessReady: boolean;
  firstWorkSubmitted: boolean;
  scopeReady: boolean;
  catalogReady: boolean;
  catalog: CatalogReadiness;
  hasDiscoveryIntake: boolean;
  billing: ClientBillingReadiness;
  systemAccess: SystemAccessReadiness;
  scope: ScopeReadiness;
  steps: ClientSetupStep[];
  adminSteps: ClientSetupStep[];
  customerSteps: ClientSetupStep[];
  blockingMessages: string[];
};

export type DeriveClientSetupReadinessInput = {
  clientId: string;
  status: ClientStatus;
  agreementStatus: AgreementStatus;
  agreementSentAt?: Date | null;
  agreementSignedAt?: Date | null;
  agreementUrl?: string | null;
  engagementType: EngagementType;
  activeServiceModels?: ServiceModelTypeValue[];
  planType: PlanType;
  weeklyHours: number;
  billingMode?: BillingMode | null;
  billingOverrideReason?: string | null;
  billingOverrideExpiresAt?: Date | null;
  billingOverrideCreatedAt?: Date | null;
  billingOverrideCreatedById?: string | null;
  stripeCustomerId?: string | null;
  stripeSubscriptionId?: string | null;
  subscriptionStatus?: string | null;
  subscriptionCurrentPeriodEnd?: Date | null;
  approvedWorkTaskCount: number;
  activeApprovedWorkTaskCount: number;
  activeCatalogTaskCount: number;
  discoveryActiveTaskCount: number;
  clientPortalUserCount: number;
  clientPortalLoggedInCount: number;
  clientOpsRequestCount: number;
  hasDiscoveryIntake: boolean;
  prospectInDiscoveryPhase: boolean;
  systemAccessStatuses: SystemAccessStatus[];
  hrefs: SetupGuideHrefs;
};

export type SetupGuideHrefs = {
  adminClient: string;
  discovery: string;
  activation: string;
  engagement: string;
  approvedWork: string;
  billing: string;
  agreement: string;
  systemAccess: string;
  portalAccessAdmin: string;
  workRequests: string;
  clientDetails: string;
  portalDashboard: string;
  portalAccount: string;
  portalAccess: string;
  portalNewRequest: string;
  adminRequests: string;
};

export function buildSetupGuideHrefs(clientId: string): SetupGuideHrefs {
  return {
    adminClient: adminClientTabHref(clientId, "overview"),
    discovery: adminClientTabHref(clientId, "discovery"),
    activation: adminClientTabHref(clientId, "setup"),
    engagement: adminClientTabHref(clientId, "setup"),
    approvedWork: adminClientTabHref(clientId, "setup"),
    billing: adminClientTabHref(clientId, "billing"),
    agreement: adminClientTabHref(clientId, "setup"),
    systemAccess: adminClientTabHref(clientId, "setup"),
    portalAccessAdmin: adminClientTabHref(clientId, "billing"),
    workRequests: adminClientTabHref(clientId, "overview"),
    clientDetails: adminClientTabHref(clientId, "overview"),
    portalDashboard: "/portal",
    portalAccount: "/portal/account",
    portalAccess: "/portal/access",
    portalNewRequest: "/portal/requests/new",
    adminRequests: `/admin/requests?clientId=${clientId}`,
  };
}

function describeSystemAccess(
  statuses: SystemAccessStatus[],
): SystemAccessReadiness {
  const total = statuses.length;
  const notProvided = statuses.filter((s) => s === SystemAccessStatus.NOT_PROVIDED).length;
  const provided = statuses.filter((s) => s === SystemAccessStatus.PROVIDED).length;
  const verified = statuses.filter((s) => s === SystemAccessStatus.VERIFIED).length;

  if (total === 0) {
    return {
      ready: false,
      status: "none_requested",
      total,
      notProvided,
      provided,
      verified,
      description: "No required system access items have been requested yet.",
    };
  }

  if (verified === total) {
    return {
      ready: true,
      status: "complete",
      total,
      notProvided,
      provided,
      verified,
      description: "All required system access items are verified.",
    };
  }

  if (provided > 0 && notProvided === 0) {
    return {
      ready: false,
      status: "in_review",
      total,
      notProvided,
      provided,
      verified,
      description: "System access details were submitted and are being reviewed.",
    };
  }

  if (provided > 0 && notProvided > 0) {
    return {
      ready: false,
      status: "partial",
      total,
      notProvided,
      provided,
      verified,
      description: "Some system access details are still missing.",
    };
  }

  return {
    ready: false,
    status: "needs_customer",
    total,
    notProvided,
    provided,
    verified,
    description: "Required system access is still needed from the customer.",
  };
}

function getScopeReadiness(input: {
  activeServiceModels: ServiceModelTypeValue[];
  approvedWorkTaskCount: number;
  activeApprovedWorkTaskCount: number;
  activeCatalogTaskCount: number;
  catalogEligibility: ReturnType<typeof getClientCatalogEligibility>;
}): ScopeReadiness {
  const { catalogEligibility } = input;
  const scopeRequired = catalogEligibility.hasSupportBlock;
  const catalogRequired = catalogEligibility.hasRequestBased;

  if (!scopeRequired && catalogRequired) {
    return {
      required: false,
      ready: catalogEligibility.requestBasedPathReady,
      approvedWorkTaskCount: input.approvedWorkTaskCount,
      activeApprovedWorkTaskCount: input.activeApprovedWorkTaskCount,
      activeCatalogTaskCount: input.activeCatalogTaskCount,
      description: catalogEligibility.requestBasedPathReady
        ? "Request-Based clients can use the active work catalog."
        : "No active work types are available in the catalog right now.",
    };
  }

  if (scopeRequired && catalogRequired) {
    const ready = catalogEligibility.catalogPathReady;
    return {
      required: true,
      ready,
      approvedWorkTaskCount: input.approvedWorkTaskCount,
      activeApprovedWorkTaskCount: input.activeApprovedWorkTaskCount,
      activeCatalogTaskCount: input.activeCatalogTaskCount,
      description: ready
        ? "Hybrid engagement has at least one eligible catalog path (approved scope or request-based catalog)."
        : "Configure approved support scope and/or seed active work types for Request-Based paths.",
    };
  }

  return {
    required: true,
    ready: catalogEligibility.supportBlockPathReady,
    approvedWorkTaskCount: input.approvedWorkTaskCount,
    activeApprovedWorkTaskCount: input.activeApprovedWorkTaskCount,
    activeCatalogTaskCount: input.activeCatalogTaskCount,
    description: catalogEligibility.supportBlockPathReady
      ? "Approved support scope is configured for Support Block work."
      : "Support Block clients need at least one approved active work type.",
  };
}

function getCatalogReadiness(input: {
  activeCatalogTaskCount: number;
  discoveryActiveTaskCount: number;
  hasRequestBased: boolean;
}): CatalogReadiness {
  const globalCatalogReady = input.activeCatalogTaskCount > 0;
  const discoveryCatalogReady = input.discoveryActiveTaskCount > 0;

  let description = `${input.activeCatalogTaskCount} active work type(s) in the global catalog.`;
  if (!globalCatalogReady && input.hasRequestBased) {
    description = "No active work types in the catalog. Request-Based and hybrid clients cannot submit work until tasks are seeded.";
  } else if (!discoveryCatalogReady) {
    description += " Discovery intake has no active discovery-flagged tasks.";
  }

  return {
    globalCatalogReady,
    discoveryCatalogReady,
    activeCatalogTaskCount: input.activeCatalogTaskCount,
    discoveryActiveTaskCount: input.discoveryActiveTaskCount,
    description,
  };
}

function buildBlockingMessages(params: {
  submitBlockers: SubmitBlockerSummary;
  billing: ClientBillingReadiness;
}): string[] {
  const messages: string[] = [];

  for (const blocker of params.submitBlockers.all) {
    if (!messages.includes(blocker.adminMessage)) {
      messages.push(blocker.adminMessage);
    }
  }

  if (!params.billing.ready && params.billing.required) {
    const billingNote =
      "Note: Billing setup is still incomplete for this Support Block account.";
    if (!messages.includes(billingNote)) {
      messages.push(billingNote);
    }
  }
  if (params.billing.status === "attention") {
    messages.push("Billing status needs review.");
  }

  return messages;
}

export function deriveClientSetupReadiness(
  input: DeriveClientSetupReadinessInput,
): ClientSetupReadiness {
  const lifecycleReady = input.status === ClientStatus.ACTIVE;
  const catalogEligibility = getClientCatalogEligibility({
    engagementType: input.engagementType,
    activeServiceModels: input.activeServiceModels,
    activeCatalogTaskCount: input.activeCatalogTaskCount,
    activeApprovedWorkTaskCount: input.activeApprovedWorkTaskCount,
  });
  const scope = getScopeReadiness({
    activeServiceModels: catalogEligibility.activeServiceModels,
    approvedWorkTaskCount: input.approvedWorkTaskCount,
    activeApprovedWorkTaskCount: input.activeApprovedWorkTaskCount,
    activeCatalogTaskCount: input.activeCatalogTaskCount,
    catalogEligibility,
  });
  const catalog = getCatalogReadiness({
    activeCatalogTaskCount: input.activeCatalogTaskCount,
    discoveryActiveTaskCount: input.discoveryActiveTaskCount,
    hasRequestBased: catalogEligibility.hasRequestBased,
  });
  const billing = getClientBillingReadiness({
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
  });
  const systemAccess = describeSystemAccess(input.systemAccessStatuses);
  const agreement = getClientAgreementReadiness({
    agreementStatus: input.agreementStatus,
    agreementSentAt: input.agreementSentAt ?? null,
    agreementSignedAt: input.agreementSignedAt ?? null,
    agreementUrl: input.agreementUrl ?? null,
  });

  const submitBlockerInput = {
    status: input.status,
    agreementStatus: input.agreementStatus,
    engagementType: input.engagementType,
    activeServiceModels: input.activeServiceModels,
    billingMode: input.billingMode,
    billingOverrideReason: input.billingOverrideReason,
    billingOverrideExpiresAt: input.billingOverrideExpiresAt,
    billingOverrideCreatedAt: input.billingOverrideCreatedAt,
    billingOverrideCreatedById: input.billingOverrideCreatedById,
    stripeCustomerId: input.stripeCustomerId,
    stripeSubscriptionId: input.stripeSubscriptionId,
    subscriptionStatus: input.subscriptionStatus,
    subscriptionCurrentPeriodEnd: input.subscriptionCurrentPeriodEnd,
    approvedWorkTaskCount: input.activeApprovedWorkTaskCount,
    activeCatalogTaskCount: input.activeCatalogTaskCount,
  };

  const submitBlockers = deriveSubmitBlockerSummary(submitBlockerInput);

  const canInvitePortal = lifecycleReady;
  const canSubmitPortalWork = submitBlockers.canSubmit;
  const primarySubmitBlockReason = submitBlockers.primary?.reasonCode;
  const primarySubmitBlockMessage = submitBlockers.primary?.portalMessage;
  const portalAccessReady = input.clientPortalLoggedInCount > 0;
  const portalInviteSent = input.clientPortalUserCount > 0;
  const firstWorkSubmitted = input.clientOpsRequestCount > 0;
  const supportAreasVisible = catalogEligibility.portalVisibleTaskCount > 0;
  const catalogReady = !catalogEligibility.hasRequestBased || catalog.globalCatalogReady;

  const blockingMessages = buildBlockingMessages({
    submitBlockers,
    billing,
  });

  const deferPostDiscoverySetup = input.prospectInDiscoveryPhase;

  const adminSteps: ClientSetupStep[] = [
    {
      id: "client-created",
      title: "Client record created",
      description: "Company is in the system and ready for setup.",
      owner: "admin",
      status: "complete",
      blockers: ["informational"],
      required: true,
      actionLabel: "View client",
      actionHref: input.hrefs.clientDetails,
      adminOnly: true,
      customerVisible: false,
    },
    {
      id: "discovery-reviewed",
      title: "Discovery / intake reviewed",
      description: input.hasDiscoveryIntake
        ? "Prospect intake exists and can be reviewed."
        : "No prospect intake request found yet.",
      owner: "admin",
      status: input.hasDiscoveryIntake ? "complete" : "incomplete",
      blockers: ["informational"],
      required: false,
      actionLabel: "Review intake",
      actionHref: input.hrefs.discovery,
      adminOnly: true,
      customerVisible: false,
    },
    {
      id: "lifecycle-active",
      title: "Client lifecycle active",
      description: lifecycleReady
        ? "Client is ACTIVE."
        : "Client must be activated before invite and portal submit are allowed.",
      owner: "admin",
      status: lifecycleReady ? "complete" : "blocked",
      blockers: ["blocks_invite", "blocks_submit"],
      required: true,
      actionLabel: "Open activation controls",
      actionHref: input.hrefs.activation,
      adminOnly: true,
      customerVisible: false,
    },
    {
      id: "engagement-selected",
      title: "Engagement selected",
      description:
        catalogEligibility.hasSupportBlock && catalogEligibility.hasRequestBased
          ? "Hybrid engagement: Support Block and Request-Based models are active."
          : catalogEligibility.hasSupportBlock
            ? "Support Block engagement is selected."
            : "Request-Based engagement is selected.",
      owner: "admin",
      status: "complete",
      blockers: ["informational"],
      required: true,
      actionLabel: "Configure engagement",
      actionHref: input.hrefs.engagement,
      adminOnly: true,
      customerVisible: false,
    },
    {
      id: "work-catalog",
      title: "Work catalog health",
      description: catalog.description,
      owner: "admin",
      status: catalog.globalCatalogReady
        ? "complete"
        : catalogEligibility.hasRequestBased
          ? "blocked"
          : "attention",
      blockers: catalogEligibility.hasRequestBased ? ["blocks_submit"] : ["informational"],
      required: catalogEligibility.hasRequestBased,
      actionLabel: "Manage work catalog",
      actionHref: "/admin/services",
      adminOnly: true,
      customerVisible: false,
    },
    {
      id: "approved-work",
      title: "Approved support scope",
      description: scope.description,
      owner: "admin",
      status: !catalogEligibility.hasSupportBlock
        ? "not_required"
        : scope.ready
          ? "complete"
          : "blocked",
      blockers: !catalogEligibility.hasSupportBlock
        ? ["informational"]
        : ["blocks_invite", "blocks_submit"],
      required: catalogEligibility.hasSupportBlock,
      actionLabel: "Configure approved work",
      actionHref: input.hrefs.approvedWork,
      adminOnly: true,
      customerVisible: false,
    },
    {
      id: "capacity",
      title: "Weekly support capacity",
      description:
        input.engagementType === EngagementType.REQUEST_BASED
          ? "Capacity hours are not used for Request-Based accounts."
          : input.weeklyHours > 0
            ? `${input.weeklyHours} reserved hours per week.`
            : "No weekly reserved hours are set.",
      owner: "admin",
      status:
        input.engagementType === EngagementType.REQUEST_BASED
          ? "not_required"
          : input.weeklyHours > 0
            ? "complete"
            : "attention",
      blockers: ["informational"],
      required: input.engagementType === EngagementType.SUPPORT_BLOCK,
      actionLabel: "Review billing and plan",
      actionHref: input.hrefs.billing,
      adminOnly: true,
      customerVisible: false,
    },
    {
      id: "service-agreement",
      title: "Service agreement",
      description:
        agreement.status === AgreementStatus.SIGNED
          ? input.agreementSignedAt
            ? `Signed ${input.agreementSignedAt.toLocaleDateString()}.`
            : "Agreement is signed."
          : agreement.status === AgreementStatus.WAIVED
            ? "Agreement requirement waived by admin."
            : agreement.status === AgreementStatus.SENT
              ? input.agreementSentAt
                ? `Sent ${input.agreementSentAt.toLocaleDateString()}. Waiting for signature.`
                : "Agreement sent. Waiting for signature."
              : "Agreement has not been sent yet.",
      owner: "admin",
      status: agreement.ready
        ? "complete"
        : lifecycleReady
          ? "blocked"
          : "incomplete",
      blockers: ["blocks_submit"],
      required: true,
      actionLabel: "Manage agreement",
      actionHref: input.hrefs.agreement,
      adminOnly: true,
      customerVisible: true,
    },
    {
      id: "billing",
      title: "Billing readiness",
      description:
        billing.billingMode !== BillingMode.STRIPE
          ? `${getAdminBillingModeHeadline(billing)}. ${billing.description}`
          : billing.description,
      owner: billing.billingMode !== BillingMode.STRIPE ? "admin" : "stripe",
      status:
        billing.status === "healthy"
          ? "complete"
          : billing.status === "attention"
            ? "attention"
            : billing.status === "not_required"
              ? "not_required"
              : "incomplete",
      blockers: ["informational"],
      required: billing.required,
      actionLabel:
        input.engagementType === EngagementType.SUPPORT_BLOCK
          ? "Set billing"
          : "View billing details",
      actionHref: input.hrefs.billing,
      adminOnly: true,
      customerVisible: true,
    },
    {
      id: "system-access-admin",
      title: "System access requested and reviewed",
      description: systemAccess.description,
      owner:
        systemAccess.status === "none_requested"
          ? "admin"
          : systemAccess.status === "needs_customer" || systemAccess.status === "partial"
            ? "customer"
            : "system",
      status:
        systemAccess.status === "complete"
          ? "complete"
          : systemAccess.status === "none_requested"
            ? "incomplete"
            : systemAccess.status === "in_review"
              ? "attention"
              : "blocked",
      blockers: ["informational"],
      required: false,
      actionLabel: "Manage system access",
      actionHref: input.hrefs.systemAccess,
      adminOnly: true,
      customerVisible: false,
    },
    {
      id: "portal-invite",
      title: "Portal invite readiness",
      description: canInvitePortal
        ? portalInviteSent
          ? "Portal invite has been sent."
          : "Portal invite can be sent."
        : "Activate the client before sending a portal invite.",
      owner: "admin",
      status: !canInvitePortal ? "blocked" : portalInviteSent ? "complete" : "incomplete",
      blockers: ["blocks_invite"],
      required: true,
      actionLabel: "Send portal invite",
      actionHref: input.hrefs.portalAccessAdmin,
      adminOnly: true,
      customerVisible: false,
    },
    {
      id: "portal-access",
      title: "Customer portal access",
      description: portalAccessReady
        ? "Customer has logged into the portal."
        : portalInviteSent
          ? "Invite sent. Waiting for the customer to log in."
          : "No portal invite sent yet.",
      owner: "customer",
      status: portalAccessReady ? "complete" : "incomplete",
      blockers: ["informational"],
      required: true,
      actionLabel: "View portal account",
      actionHref: input.hrefs.portalDashboard,
      adminOnly: true,
      customerVisible: true,
    },
    {
      id: "customer-system-access",
      title: "Customer provided system access",
      description:
        systemAccess.status === "complete"
          ? "Customer setup data is complete."
          : systemAccess.status === "in_review"
            ? "System access details are waiting on Hargen review."
            : "System access details are still needed.",
      owner:
        systemAccess.status === "in_review" || systemAccess.status === "complete"
          ? "system"
          : "customer",
      status:
        systemAccess.status === "complete"
          ? "complete"
          : systemAccess.status === "in_review"
            ? "attention"
            : "blocked",
      blockers: ["informational"],
      required: false,
      actionLabel: "Open system access",
      actionHref: input.hrefs.portalAccess,
      adminOnly: true,
      customerVisible: true,
    },
    {
      id: "first-work",
      title: "First work request submitted",
      description: firstWorkSubmitted
        ? "At least one CLIENT_OPS request has been submitted."
        : "No customer operations request submitted yet.",
      owner: "customer",
      status: firstWorkSubmitted ? "complete" : "incomplete",
      blockers: ["informational"],
      required: false,
      actionLabel: "Review work requests",
      actionHref: input.hrefs.adminRequests,
      adminOnly: true,
      customerVisible: true,
    },
  ];

  const customerSteps: ClientSetupStep[] = [
    {
      id: "portal-access-ready",
      title: "Portal access",
      description: portalAccessReady
        ? "Your portal access is active."
        : "Hargen needs to send your portal invite.",
      owner: portalAccessReady ? "customer" : "admin",
      status: portalAccessReady ? "complete" : "incomplete",
      blockers: ["informational"],
      required: true,
      actionLabel: "Open account",
      actionHref: input.hrefs.portalAccount,
      adminOnly: false,
      customerVisible: true,
    },
    {
      id: "customer-agreement",
      title: "Service agreement",
      description: agreement.ready
        ? agreement.status === AgreementStatus.WAIVED
          ? "Agreement requirement waived for your account."
          : "Your service agreement is complete."
        : agreement.status === AgreementStatus.SENT
          ? input.agreementUrl
            ? "Review and sign your agreement using the link from Hargen."
            : "Hargen sent your agreement. Contact your account manager if you need the link."
          : "Hargen is preparing your service agreement.",
      owner: agreement.ready ? "customer" : "admin",
      status: agreement.ready ? "complete" : "blocked",
      blockers: ["blocks_submit"],
      required: true,
      actionLabel: input.agreementUrl ? "Open agreement" : "Contact Hargen",
      actionHref: input.agreementUrl ?? input.hrefs.portalAccount,
      adminOnly: false,
      customerVisible: true,
    },
    {
      id: "customer-billing",
      title: "Billing setup",
      description:
        billing.status === "not_required"
          ? "Billing is handled per request."
          : billing.status === "not_started"
            ? "Billing setup is still pending with Hargen."
            : billing.customerDescription,
      owner:
        billing.status === "not_started"
          ? "admin"
          : billing.billingMode !== BillingMode.STRIPE
            ? "admin"
            : "stripe",
      status:
        billing.status === "healthy"
          ? "complete"
          : billing.status === "attention"
            ? "attention"
            : billing.status === "not_required"
              ? "not_required"
              : "incomplete",
      blockers: ["informational"],
      required: billing.required,
      actionLabel: "Set up billing",
      actionHref: input.hrefs.portalAccount,
      adminOnly: false,
      customerVisible: true,
    },
    {
      id: "customer-system-access",
      title: "Provide system access",
      description: systemAccess.description,
      owner:
        systemAccess.status === "in_review" || systemAccess.status === "complete"
          ? "system"
          : "customer",
      status:
        systemAccess.status === "complete"
          ? "complete"
          : systemAccess.status === "in_review"
            ? "attention"
            : "incomplete",
      blockers: ["informational"],
      required: false,
      actionLabel: "Provide system access",
      actionHref: input.hrefs.portalAccess,
      adminOnly: false,
      customerVisible: true,
    },
    {
      id: "support-areas-visible",
      title: "Approved support areas",
      description: supportAreasVisible
        ? catalogEligibility.hasRequestBased && catalogEligibility.hasSupportBlock
          ? "Your work types include request-based catalog options and approved support areas."
          : "Your supported work areas are visible."
        : catalogEligibility.hasSupportBlock
          ? "Hargen is still configuring your approved support areas."
          : "No active work types are available right now.",
      owner: supportAreasVisible ? "customer" : "admin",
      status: supportAreasVisible
        ? "complete"
        : catalogEligibility.hasSupportBlock
          ? "blocked"
          : "incomplete",
      blockers:
        !supportAreasVisible && catalogEligibility.hasSupportBlock
          ? ["blocks_submit"]
          : ["informational"],
      required: true,
      actionLabel: "View support setup",
      actionHref: input.hrefs.portalAccount,
      adminOnly: false,
      customerVisible: true,
    },
    {
      id: "send-work-ready",
      title: "Send work readiness",
      description: canSubmitPortalWork
        ? "You can submit work requests."
        : "Send work is blocked until setup requirements are complete.",
      owner: canSubmitPortalWork ? "customer" : "admin",
      status: canSubmitPortalWork ? "complete" : "blocked",
      blockers: ["blocks_submit"],
      required: true,
      actionLabel: "Send work",
      actionHref: input.hrefs.portalNewRequest,
      adminOnly: false,
      customerVisible: true,
    },
    {
      id: "first-work-submitted",
      title: "First work request",
      description: firstWorkSubmitted
        ? "Your first operations request is submitted."
        : "Submit your first request when ready.",
      owner: "customer",
      status: firstWorkSubmitted ? "complete" : "incomplete",
      blockers: ["informational"],
      required: false,
      actionLabel: "Send work",
      actionHref: input.hrefs.portalNewRequest,
      adminOnly: false,
      customerVisible: true,
    },
  ];

  const postDiscoveryStepIds = new Set([
    "lifecycle-active",
    "engagement-selected",
    "work-catalog",
    "approved-work",
    "capacity",
    "service-agreement",
    "billing",
    "system-access-admin",
    "portal-invite",
    "portal-access",
    "customer-system-access",
    "first-work",
  ]);

  const finalAdminSteps = deferPostDiscoverySetup
    ? adminSteps.map((step) => {
        if (postDiscoveryStepIds.has(step.id)) {
          return {
            ...step,
            status: "future" as SetupStepStatus,
            required: false,
            blockers: [] as SetupStepBlocker[],
          };
        }
        if (step.id === "discovery-reviewed") {
          return { ...step, status: "not_required" as SetupStepStatus, required: false };
        }
        return step;
      })
    : adminSteps;

  const enrichedAdminSteps = enrichSetupSteps(finalAdminSteps, ADMIN_STEP_SHEET);
  const enrichedCustomerSteps = enrichSetupSteps(customerSteps, CUSTOMER_STEP_SHEET);
  const steps = [...enrichedAdminSteps, ...enrichedCustomerSteps];

  return {
    clientId: input.clientId,
    clientStatus: input.status,
    engagementType: input.engagementType,
    planType: input.planType,
    weeklyHours: input.weeklyHours,
    canInvitePortal,
    canSubmitPortalWork,
    primarySubmitBlockReason,
    primarySubmitBlockMessage,
    submitBlockers,
    allSubmitBlockers: submitBlockers.all,
    agreementReady: agreement.ready,
    agreement,
    billingReady: billing.ready,
    systemAccessReady: systemAccess.ready,
    portalAccessReady,
    firstWorkSubmitted,
    scopeReady: scope.ready,
    catalogReady,
    catalog,
    hasDiscoveryIntake: input.hasDiscoveryIntake,
    billing,
    systemAccess,
    scope,
    steps,
    adminSteps: enrichedAdminSteps,
    customerSteps: enrichedCustomerSteps,
    blockingMessages,
  };
}

export async function getClientSetupReadiness(
  clientId: string,
): Promise<ClientSetupReadiness | { error: string }> {
  const client = await prisma.client.findUnique({
    where: { id: clientId },
    select: {
      id: true,
      status: true,
      agreementStatus: true,
      agreementSentAt: true,
      agreementSignedAt: true,
      agreementUrl: true,
      engagementType: true,
      serviceModels: { select: { modelType: true, isActive: true } },
      planType: true,
      weeklyHours: true,
      billingMode: true,
      billingOverrideReason: true,
      billingOverrideExpiresAt: true,
      billingOverrideCreatedAt: true,
      billingOverrideCreatedById: true,
      stripeCustomerId: true,
      stripeSubscriptionId: true,
      subscriptionStatus: true,
      subscriptionCurrentPeriodEnd: true,
      approvedWorkTasks: { select: { workTaskId: true } },
      users: {
        where: { role: Role.CLIENT },
        select: { id: true, lastLoginAt: true },
      },
      systemAccesses: {
        select: { status: true },
      },
    },
  });

  if (!client) {
    return { error: "Client not found." };
  }

  const approvedIds = client.approvedWorkTasks.map((entry) => entry.workTaskId);

  const [catalogCounts, clientOpsRequestCount, hasDiscovery, latestIntake] = await Promise.all([
    loadCatalogTaskCounts(approvedIds),
    prisma.supportRequest.count({
        where: { clientId, kind: SupportRequestKind.CLIENT_OPS },
      }),
      prisma.supportRequest.count({
        where: { clientId, kind: SupportRequestKind.PROSPECT_INTAKE },
      }),
      prisma.supportRequest.findFirst({
        where: { clientId, kind: SupportRequestKind.PROSPECT_INTAKE },
        orderBy: { createdAt: "desc" },
        select: {
          status: true,
          discoveryAppointments: {
            orderBy: { createdAt: "desc" },
            take: 1,
            select: { recapSentAt: true, fitDecision: true },
          },
        },
      }),
    ]);

  const latestAppointment = latestIntake?.discoveryAppointments[0] ?? null;
  const prospectInDiscoveryPhase =
    client.status === ClientStatus.LEAD &&
    !(
      latestAppointment?.recapSentAt ||
      latestIntake?.status === RequestStatus.COMPLETE ||
      latestAppointment?.fitDecision === DiscoveryFitDecision.GOOD_FIT
    );

  return deriveClientSetupReadiness({
    clientId: client.id,
    status: client.status,
    agreementStatus: client.agreementStatus,
    agreementSentAt: client.agreementSentAt,
    agreementSignedAt: client.agreementSignedAt,
    agreementUrl: client.agreementUrl,
    engagementType: client.engagementType,
    activeServiceModels: client.serviceModels
      .filter((item) => item.isActive)
      .map((item) => item.modelType),
    planType: client.planType,
    weeklyHours: client.weeklyHours,
    billingMode: client.billingMode,
    billingOverrideReason: client.billingOverrideReason,
    billingOverrideExpiresAt: client.billingOverrideExpiresAt,
    billingOverrideCreatedAt: client.billingOverrideCreatedAt,
    billingOverrideCreatedById: client.billingOverrideCreatedById,
    stripeCustomerId: client.stripeCustomerId,
    stripeSubscriptionId: client.stripeSubscriptionId,
    subscriptionStatus: client.subscriptionStatus,
    subscriptionCurrentPeriodEnd: client.subscriptionCurrentPeriodEnd,
    approvedWorkTaskCount: approvedIds.length,
    activeApprovedWorkTaskCount: catalogCounts.activeApprovedWorkTaskCount,
    activeCatalogTaskCount: catalogCounts.activeCatalogTaskCount,
    discoveryActiveTaskCount: catalogCounts.discoveryActiveTaskCount,
    clientPortalUserCount: client.users.length,
    clientPortalLoggedInCount: countPortalLoggedInUsers(client.users),
    clientOpsRequestCount,
    hasDiscoveryIntake: hasDiscovery > 0,
    prospectInDiscoveryPhase,
    systemAccessStatuses: client.systemAccesses.map((record) => record.status),
    hrefs: buildSetupGuideHrefs(clientId),
  });
}
