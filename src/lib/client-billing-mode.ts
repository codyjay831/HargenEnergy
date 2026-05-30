import { format } from "date-fns";

import { BillingMode, PlanType } from "@/generated/prisma/client";
import type { ClientBillingReadiness } from "@/lib/client-billing-readiness";
import { parseSupportPlanType } from "@/lib/support-plan-hours";

const BILLING_MODE_SET = new Set<string>([
  BillingMode.STRIPE,
  BillingMode.MANUAL,
  BillingMode.COMPED_INTERNAL,
  BillingMode.DEMO,
]);

export type UpdateClientBillingModeInput = {
  clientId: string;
  billingMode: string;
  reason?: string | null;
  expiresAt?: string | null;
  planType?: string | null;
};

export type ValidateClientBillingModeOptions = {
  requiresSupportBlockPlan?: boolean;
};

export type ValidatedBillingModeUpdate = {
  billingMode: BillingMode;
  billingOverrideReason: string | null;
  billingOverrideExpiresAt: Date | null;
  planType?: PlanType;
};

function parseFutureExpiration(value?: string | null): Date | null | "invalid" | "past" {
  if (!value || value.trim().length === 0) {
    return null;
  }

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return "invalid";
  }

  if (parsed.getTime() <= Date.now()) {
    return "past";
  }

  return parsed;
}

export function validateClientBillingModeUpdate(
  input: UpdateClientBillingModeInput,
  options?: ValidateClientBillingModeOptions,
): { ok: true; data: ValidatedBillingModeUpdate } | { ok: false; error: string } {
  if (!input.clientId?.trim()) {
    return { ok: false, error: "Client is required." };
  }

  if (!BILLING_MODE_SET.has(input.billingMode)) {
    return { ok: false, error: "Invalid billing mode." };
  }

  const billingMode = input.billingMode as BillingMode;

  if (billingMode === BillingMode.STRIPE) {
    return {
      ok: true,
      data: {
        billingMode,
        billingOverrideReason: null,
        billingOverrideExpiresAt: null,
      },
    };
  }

  let planType: PlanType | undefined;
  if (options?.requiresSupportBlockPlan) {
    const parsed = parseSupportPlanType(input.planType);
    if (!parsed) {
      return {
        ok: false,
        error: "Support Block plan is required (Light, Core, or Priority).",
      };
    }
    planType = parsed;
  }

  const reason = input.reason?.trim() ?? "";
  if (reason.length < 3) {
    return { ok: false, error: "Reason is required (at least 3 characters)." };
  }
  if (reason.length > 500) {
    return { ok: false, error: "Reason must be at most 500 characters." };
  }

  const expiration = parseFutureExpiration(input.expiresAt);

  if (billingMode === BillingMode.DEMO) {
    if (expiration === null) {
      return { ok: false, error: "Demo billing requires an expiration date." };
    }
    if (expiration === "invalid") {
      return { ok: false, error: "Expiration date is invalid." };
    }
    if (expiration === "past") {
      return { ok: false, error: "Expiration date must be in the future." };
    }

    return {
      ok: true,
      data: {
        billingMode,
        billingOverrideReason: reason,
        billingOverrideExpiresAt: expiration,
        planType,
      },
    };
  }

  if (expiration === "invalid") {
    return { ok: false, error: "Expiration date is invalid." };
  }
  if (expiration === "past") {
    return { ok: false, error: "Expiration date must be in the future." };
  }

  return {
    ok: true,
    data: {
      billingMode,
      billingOverrideReason: reason,
      billingOverrideExpiresAt: expiration,
      planType,
    },
  };
}

export const BILLING_MODE_ADMIN_LABELS: Record<BillingMode, string> = {
  [BillingMode.STRIPE]: "Stripe subscription",
  [BillingMode.MANUAL]: "Manual billing",
  [BillingMode.COMPED_INTERNAL]: "Comped internal",
  [BillingMode.DEMO]: "Demo",
};

export function hasStoredStripeBillingData(readiness: ClientBillingReadiness): boolean {
  return Boolean(
    readiness.stripeCustomerId ||
      readiness.stripeSubscriptionId ||
      readiness.subscriptionStatus,
  );
}

export function getAdminBillingModeHeadline(readiness: ClientBillingReadiness): string {
  if (readiness.billingMode === BillingMode.STRIPE) {
    return "Stripe billing is authoritative";
  }

  if (readiness.overrideExpired) {
    return readiness.billingMode === BillingMode.DEMO
      ? "Demo expired"
      : `${BILLING_MODE_ADMIN_LABELS[readiness.billingMode]} expired`;
  }

  switch (readiness.billingMode) {
    case BillingMode.MANUAL:
      return "Manual billing active";
    case BillingMode.COMPED_INTERNAL:
      return "Comped internal active";
    case BillingMode.DEMO:
      if (readiness.billingOverrideExpiresAt) {
        return `Demo active until ${format(
          new Date(readiness.billingOverrideExpiresAt),
          "MMM d, yyyy",
        )}`;
      }
      return "Demo active";
    default:
      return BILLING_MODE_ADMIN_LABELS[readiness.billingMode];
  }
}

export function getAdminBillingListLabel(readiness: ClientBillingReadiness): string {
  if (readiness.billingMode === BillingMode.STRIPE) {
    return readiness.statusLabel;
  }

  return getAdminBillingModeHeadline(readiness);
}

export function getAdminStripeInformationalNote(
  readiness: ClientBillingReadiness,
): string | null {
  if (readiness.billingMode === BillingMode.STRIPE || !hasStoredStripeBillingData(readiness)) {
    return null;
  }

  const modeLabel = BILLING_MODE_ADMIN_LABELS[readiness.billingMode];
  const statusSuffix = readiness.subscriptionStatus
    ? ` (${readiness.subscriptionStatus})`
    : "";

  return `Stripe subscription exists${statusSuffix}, but current billing mode is ${modeLabel}. Stripe is not authoritative until you return to Stripe billing.`;
}
