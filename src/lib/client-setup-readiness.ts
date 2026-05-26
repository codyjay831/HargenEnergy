import {
  BillingMode,
  ClientStatus,
  EngagementType,
  PlanType,
  Role,
  SupportRequestKind,
  SystemAccessStatus,
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

export type ClientSetupReadiness = {
  clientId: string;
  clientStatus: ClientStatus;
  engagementType: EngagementType;
  planType: PlanType;
  weeklyHours: number;
  canInvitePortal: boolean;
  canSubmitPortalWork: boolean;
  billingReady: boolean;
  systemAccessReady: boolean;
  portalAccessReady: boolean;
  firstWorkSubmitted: boolean;
  scopeReady: boolean;
  hasWalkthroughIntake: boolean;
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
  engagementType: EngagementType;
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
  clientPortalUserCount: number;
  clientOpsRequestCount: number;
  hasWalkthroughIntake: boolean;
  systemAccessStatuses: SystemAccessStatus[];
  hrefs: SetupGuideHrefs;
};

export type SetupGuideHrefs = {
  adminClient: string;
  walkthrough: string;
  activation: string;
  engagement: string;
  approvedWork: string;
  billing: string;
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
  const adminBase = `/admin/clients/${clientId}`;
  return {
    adminClient: adminBase,
    walkthrough: `${adminBase}?tab=walkthrough&open=walkthrough`,
    activation: `${adminBase}?tab=setup`,
    engagement: `${adminBase}?tab=setup`,
    approvedWork: `${adminBase}?tab=setup`,
    billing: `${adminBase}?tab=billing`,
    systemAccess: `${adminBase}?tab=setup`,
    portalAccessAdmin: `${adminBase}?tab=billing`,
    workRequests: adminBase,
    clientDetails: adminBase,
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
  engagementType: EngagementType;
  approvedWorkTaskCount: number;
  activeApprovedWorkTaskCount: number;
  activeCatalogTaskCount: number;
}): ScopeReadiness {
  if (input.engagementType === EngagementType.REQUEST_BASED) {
    return {
      required: false,
      ready: input.activeCatalogTaskCount > 0,
      approvedWorkTaskCount: input.approvedWorkTaskCount,
      activeApprovedWorkTaskCount: input.activeApprovedWorkTaskCount,
      activeCatalogTaskCount: input.activeCatalogTaskCount,
      description:
        input.activeCatalogTaskCount > 0
          ? "Request-Based clients can use the active work catalog."
          : "No active work types are available in the catalog right now.",
    };
  }

  return {
    required: true,
    ready: input.activeApprovedWorkTaskCount > 0,
    approvedWorkTaskCount: input.approvedWorkTaskCount,
    activeApprovedWorkTaskCount: input.activeApprovedWorkTaskCount,
    activeCatalogTaskCount: input.activeCatalogTaskCount,
    description:
      input.activeApprovedWorkTaskCount > 0
        ? "Approved support scope is configured for Support Block work."
        : "Support Block clients need at least one approved active work type.",
  };
}

function buildBlockingMessages(params: {
  canInvitePortal: boolean;
  canSubmitPortalWork: boolean;
  scope: ScopeReadiness;
  lifecycleReady: boolean;
  billing: ClientBillingReadiness;
}): string[] {
  const messages: string[] = [];

  if (!params.lifecycleReady) {
    messages.push("Activate the client before portal invite or portal work submission.");
  }
  if (!params.scope.ready && params.scope.required) {
    messages.push("Configure approved support work before inviting portal users.");
  }
  if (!params.canSubmitPortalWork) {
    messages.push("Portal work submission is blocked until setup requirements are met.");
  }
  if (!params.billing.ready && params.billing.required) {
    messages.push("Note: Billing setup is still incomplete for this Support Block account.");
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
  const scope = getScopeReadiness({
    engagementType: input.engagementType,
    approvedWorkTaskCount: input.approvedWorkTaskCount,
    activeApprovedWorkTaskCount: input.activeApprovedWorkTaskCount,
    activeCatalogTaskCount: input.activeCatalogTaskCount,
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

  const canInvitePortal = lifecycleReady && scope.ready;
  const canSubmitPortalWork = lifecycleReady && scope.ready;
  const portalAccessReady = input.clientPortalUserCount > 0;
  const firstWorkSubmitted = input.clientOpsRequestCount > 0;
  const supportAreasVisible =
    input.engagementType === EngagementType.REQUEST_BASED
      ? input.activeCatalogTaskCount > 0
      : scope.ready;

  const blockingMessages = buildBlockingMessages({
    canInvitePortal,
    canSubmitPortalWork,
    scope,
    lifecycleReady,
    billing,
  });

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
      id: "walkthrough-reviewed",
      title: "Walkthrough / intake reviewed",
      description: input.hasWalkthroughIntake
        ? "Prospect intake exists and can be reviewed."
        : "No prospect intake request found yet.",
      owner: "admin",
      status: input.hasWalkthroughIntake ? "complete" : "incomplete",
      blockers: ["informational"],
      required: false,
      actionLabel: "Review intake",
      actionHref: input.hrefs.walkthrough,
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
        input.engagementType === EngagementType.SUPPORT_BLOCK
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
      id: "approved-work",
      title: "Approved support scope",
      description: scope.description,
      owner: "admin",
      status:
        input.engagementType === EngagementType.REQUEST_BASED
          ? "not_required"
          : scope.ready
            ? "complete"
            : "blocked",
      blockers:
        input.engagementType === EngagementType.REQUEST_BASED
          ? ["informational"]
          : ["blocks_invite", "blocks_submit"],
      required: input.engagementType === EngagementType.SUPPORT_BLOCK,
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
        ? "Portal invite can be sent."
        : "Portal invite is blocked until lifecycle and scope requirements are complete.",
      owner: "admin",
      status: canInvitePortal ? "complete" : "blocked",
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
        ? `${input.clientPortalUserCount} portal user(s) available.`
        : "No portal user is linked yet.",
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
        ? "Your supported work areas are visible."
        : input.engagementType === EngagementType.SUPPORT_BLOCK
          ? "Hargen is still configuring your approved support areas."
          : "No active work types are available right now.",
      owner: supportAreasVisible ? "customer" : "admin",
      status:
        supportAreasVisible
          ? "complete"
          : input.engagementType === EngagementType.SUPPORT_BLOCK
            ? "blocked"
            : "incomplete",
      blockers:
        input.engagementType === EngagementType.SUPPORT_BLOCK && !supportAreasVisible
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

  const enrichedAdminSteps = enrichSetupSteps(adminSteps, ADMIN_STEP_SHEET);
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
    billingReady: billing.ready,
    systemAccessReady: systemAccess.ready,
    portalAccessReady,
    firstWorkSubmitted,
    scopeReady: scope.ready,
    hasWalkthroughIntake: input.hasWalkthroughIntake,
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
      engagementType: true,
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
        select: { id: true },
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

  const [activeCatalogTaskCount, activeApprovedWorkTaskCount, clientOpsRequestCount, hasWalkthrough] =
    await Promise.all([
      prisma.workTask.count({ where: { isActive: true } }),
      approvedIds.length === 0
        ? Promise.resolve(0)
        : prisma.workTask.count({
            where: { isActive: true, id: { in: approvedIds } },
          }),
      prisma.supportRequest.count({
        where: { clientId, kind: SupportRequestKind.CLIENT_OPS },
      }),
      prisma.supportRequest.count({
        where: { clientId, kind: SupportRequestKind.PROSPECT_INTAKE },
      }),
    ]);

  return deriveClientSetupReadiness({
    clientId: client.id,
    status: client.status,
    engagementType: client.engagementType,
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
    activeApprovedWorkTaskCount,
    activeCatalogTaskCount,
    clientPortalUserCount: client.users.length,
    clientOpsRequestCount,
    hasWalkthroughIntake: hasWalkthrough > 0,
    systemAccessStatuses: client.systemAccesses.map((record) => record.status),
    hrefs: buildSetupGuideHrefs(clientId),
  });
}
