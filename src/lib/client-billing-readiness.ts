import { BillingMode, EngagementType } from "@/generated/prisma/client";

export type BillingReadinessStatus =
  | "not_required"
  | "not_started"
  | "configured"
  | "healthy"
  | "attention";

export type BillingReadinessInput = {
  engagementType: EngagementType;
  billingMode?: BillingMode | null;
  billingOverrideReason?: string | null;
  billingOverrideExpiresAt?: Date | null;
  billingOverrideCreatedAt?: Date | null;
  billingOverrideCreatedById?: string | null;
  stripeCustomerId?: string | null;
  stripeSubscriptionId?: string | null;
  subscriptionStatus?: string | null;
  subscriptionCurrentPeriodEnd?: Date | null;
};

export type ClientBillingReadiness = {
  billingMode: BillingMode;
  overrideActive: boolean;
  overrideExpired: boolean;
  billingOverrideReason: string | null;
  billingOverrideExpiresAt: Date | null;
  billingOverrideCreatedAt: Date | null;
  billingOverrideCreatedById: string | null;
  required: boolean;
  ready: boolean;
  healthy: boolean;
  status: BillingReadinessStatus;
  statusLabel: string;
  description: string;
  customerStatusLabel: string;
  customerDescription: string;
  subscriptionStatus: string | null;
  stripeCustomerId: string | null;
  stripeSubscriptionId: string | null;
  subscriptionCurrentPeriodEnd: Date | null;
};

const HEALTHY_SUBSCRIPTION_STATUSES = new Set(["active", "trialing"]);
const ATTENTION_SUBSCRIPTION_STATUSES = new Set([
  "past_due",
  "canceled",
  "unpaid",
  "incomplete",
  "incomplete_expired",
  "paused",
]);

function normalizeSubscriptionStatus(value?: string | null): string | null {
  if (!value) return null;
  const trimmed = value.trim().toLowerCase();
  return trimmed.length > 0 ? trimmed : null;
}

function normalizeBillingMode(value?: BillingMode | null): BillingMode {
  return value ?? BillingMode.STRIPE;
}

export function getClientBillingReadiness(
  input: BillingReadinessInput,
): ClientBillingReadiness {
  const billingMode = normalizeBillingMode(input.billingMode);
  const billingOverrideReason = input.billingOverrideReason ?? null;
  const billingOverrideExpiresAt = input.billingOverrideExpiresAt ?? null;
  const billingOverrideCreatedAt = input.billingOverrideCreatedAt ?? null;
  const billingOverrideCreatedById = input.billingOverrideCreatedById ?? null;

  const subscriptionStatus = normalizeSubscriptionStatus(input.subscriptionStatus);
  const stripeCustomerId = input.stripeCustomerId ?? null;
  const stripeSubscriptionId = input.stripeSubscriptionId ?? null;
  const subscriptionCurrentPeriodEnd = input.subscriptionCurrentPeriodEnd ?? null;
  const overrideExpired =
    billingOverrideExpiresAt != null && billingOverrideExpiresAt.getTime() <= Date.now();
  const overrideActive = billingMode !== BillingMode.STRIPE && !overrideExpired;

  if (billingMode !== BillingMode.STRIPE) {
    if (overrideExpired) {
      const expiredLabel =
        billingMode === BillingMode.DEMO ? "Demo expired" : "Billing override expired";
      return {
        billingMode,
        overrideActive,
        overrideExpired,
        billingOverrideReason,
        billingOverrideExpiresAt,
        billingOverrideCreatedAt,
        billingOverrideCreatedById,
        required: false,
        ready: false,
        healthy: false,
        status: "attention",
        statusLabel: expiredLabel,
        description:
          "The billing override has expired and needs admin review before continuing as non-Stripe billing.",
        customerStatusLabel: "Billing needs attention",
        customerDescription:
          "Billing details need review by Hargen. Contact support if you need immediate help.",
        subscriptionStatus,
        stripeCustomerId,
        stripeSubscriptionId,
        subscriptionCurrentPeriodEnd,
      };
    }

    if (billingMode === BillingMode.MANUAL) {
      return {
        billingMode,
        overrideActive,
        overrideExpired,
        billingOverrideReason,
        billingOverrideExpiresAt,
        billingOverrideCreatedAt,
        billingOverrideCreatedById,
        required: false,
        ready: true,
        healthy: true,
        status: "healthy",
        statusLabel: "Manual billing",
        description: "Billing is managed by Hargen outside Stripe.",
        customerStatusLabel: "Billing handled by Hargen",
        customerDescription:
          "No payment setup is needed right now. Billing is handled directly by Hargen.",
        subscriptionStatus,
        stripeCustomerId,
        stripeSubscriptionId,
        subscriptionCurrentPeriodEnd,
      };
    }

    if (billingMode === BillingMode.COMPED_INTERNAL) {
      return {
        billingMode,
        overrideActive,
        overrideExpired,
        billingOverrideReason,
        billingOverrideExpiresAt,
        billingOverrideCreatedAt,
        billingOverrideCreatedById,
        required: false,
        ready: true,
        healthy: true,
        status: "healthy",
        statusLabel: "Comped internal",
        description: "Internal no-charge billing mode is active.",
        customerStatusLabel: "Billing handled by Hargen",
        customerDescription:
          "No payment setup is needed right now. Billing is handled by Hargen.",
        subscriptionStatus,
        stripeCustomerId,
        stripeSubscriptionId,
        subscriptionCurrentPeriodEnd,
      };
    }

    return {
      billingMode,
      overrideActive,
      overrideExpired,
      billingOverrideReason,
      billingOverrideExpiresAt,
      billingOverrideCreatedAt,
      billingOverrideCreatedById,
      required: false,
      ready: true,
      healthy: true,
      status: "healthy",
      statusLabel: "Demo active",
      description: "Demo billing mode is active.",
      customerStatusLabel: "No payment setup needed right now",
      customerDescription:
        "No payment setup is needed right now while your demo access is active.",
      subscriptionStatus,
      stripeCustomerId,
      stripeSubscriptionId,
      subscriptionCurrentPeriodEnd,
    };
  }

  if (input.engagementType === EngagementType.REQUEST_BASED) {
    return {
      billingMode,
      overrideActive,
      overrideExpired,
      billingOverrideReason,
      billingOverrideExpiresAt,
      billingOverrideCreatedAt,
      billingOverrideCreatedById,
      required: false,
      ready: true,
      healthy: true,
      status: "not_required",
      statusLabel: "Not required",
      description:
        "Request-Based accounts are priced per request. Stripe subscription setup is not required.",
      customerStatusLabel: "Not required",
      customerDescription:
        "Billing is handled per request. No subscription setup is required.",
      subscriptionStatus,
      stripeCustomerId,
      stripeSubscriptionId,
      subscriptionCurrentPeriodEnd,
    };
  }

  const hasConfiguredBilling = Boolean(stripeSubscriptionId || subscriptionStatus);
  if (!hasConfiguredBilling) {
    return {
      billingMode,
      overrideActive,
      overrideExpired,
      billingOverrideReason,
      billingOverrideExpiresAt,
      billingOverrideCreatedAt,
      billingOverrideCreatedById,
      required: true,
      ready: false,
      healthy: false,
      status: "not_started",
      statusLabel: "Needs setup",
      description:
        "Stripe billing has not been configured yet for this Support Block account.",
      customerStatusLabel: "Billing setup needed",
      customerDescription:
        "Billing setup is still pending. Hargen will let you know when it is complete.",
      subscriptionStatus,
      stripeCustomerId,
      stripeSubscriptionId,
      subscriptionCurrentPeriodEnd,
    };
  }

  if (subscriptionStatus && HEALTHY_SUBSCRIPTION_STATUSES.has(subscriptionStatus)) {
    return {
      billingMode,
      overrideActive,
      overrideExpired,
      billingOverrideReason,
      billingOverrideExpiresAt,
      billingOverrideCreatedAt,
      billingOverrideCreatedById,
      required: true,
      ready: true,
      healthy: true,
      status: "healthy",
      statusLabel: "Ready",
      description:
        "Billing is configured and the subscription is in a healthy state.",
      customerStatusLabel: "Billing ready",
      customerDescription: "Billing is configured and in good standing.",
      subscriptionStatus,
      stripeCustomerId,
      stripeSubscriptionId,
      subscriptionCurrentPeriodEnd,
    };
  }

  if (!subscriptionStatus) {
    return {
      billingMode,
      overrideActive,
      overrideExpired,
      billingOverrideReason,
      billingOverrideExpiresAt,
      billingOverrideCreatedAt,
      billingOverrideCreatedById,
      required: true,
      ready: true,
      healthy: false,
      status: "configured",
      statusLabel: "Configured",
      description:
        "Billing has been started, but subscription status is still syncing.",
      customerStatusLabel: "Billing in progress",
      customerDescription:
        "Billing setup is in progress and still syncing. Please check back shortly.",
      subscriptionStatus,
      stripeCustomerId,
      stripeSubscriptionId,
      subscriptionCurrentPeriodEnd,
    };
  }

  if (ATTENTION_SUBSCRIPTION_STATUSES.has(subscriptionStatus)) {
    return {
      billingMode,
      overrideActive,
      overrideExpired,
      billingOverrideReason,
      billingOverrideExpiresAt,
      billingOverrideCreatedAt,
      billingOverrideCreatedById,
      required: true,
      ready: true,
      healthy: false,
      status: "attention",
      statusLabel: "Needs attention",
      description:
        "Billing is configured, but the current subscription state needs review.",
      customerStatusLabel: "Billing needs attention",
      customerDescription:
        "Billing needs attention. Contact Hargen if you need help.",
      subscriptionStatus,
      stripeCustomerId,
      stripeSubscriptionId,
      subscriptionCurrentPeriodEnd,
    };
  }

  return {
    billingMode,
    overrideActive,
    overrideExpired,
    billingOverrideReason,
    billingOverrideExpiresAt,
    billingOverrideCreatedAt,
    billingOverrideCreatedById,
    required: true,
    ready: true,
    healthy: false,
    status: "configured",
    statusLabel: "Configured",
    description: "Billing is configured. Review subscription status if needed.",
    customerStatusLabel: "Billing configured",
    customerDescription: "Billing is configured.",
    subscriptionStatus,
    stripeCustomerId,
    stripeSubscriptionId,
    subscriptionCurrentPeriodEnd,
  };
}

export type BillingBadgeVariant = "default" | "secondary" | "destructive" | "outline";

export function getBillingBadgeVariant(
  readiness: ClientBillingReadiness,
): BillingBadgeVariant {
  switch (readiness.status) {
    case "healthy":
      return "default";
    case "attention":
      return "destructive";
    case "not_started":
      return "secondary";
    case "not_required":
      return "outline";
    default:
      return "secondary";
  }
}
