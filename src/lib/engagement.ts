/**
 * Engagement type controls how the client buys help.
 * SUPPORT_BLOCK clients buy reserved support time inside approved work types.
 * REQUEST_BASED clients send individual work requests that are reviewed and priced per request.
 */

import {
  BillableType,
  EngagementType,
  HandoffTier,
  PricingMode,
  RequestPaymentStatus,
  type Client,
  type ClientServiceModel,
  type SupportRequest,
  type WorkTask,
} from "@/generated/prisma/client";
import { PRODUCT_LANGUAGE } from "@/lib/product-language";
import {
  getActiveServiceModelTypes,
  hasServiceModel,
} from "@/lib/client-service-model";
import { assertWorkTaskEligibleForClient } from "@/lib/client-catalog-eligibility";

export type ClientWithApprovals = Client & {
  approvedWorkTasks?: { workTaskId: string }[];
  serviceModels?: Array<Pick<ClientServiceModel, "modelType" | "isActive">>;
};

export function getApprovedWorkTaskIds(client: ClientWithApprovals): string[] {
  return client.approvedWorkTasks?.map((a) => a.workTaskId) ?? [];
}

export type WorkTaskEligibilityResult =
  | { ok: true; workTask: WorkTask }
  | { ok: false; error: string };

export async function resolveActiveWorkTask(
  workTaskId: string,
  findWorkTask: (id: string) => Promise<WorkTask | null>,
): Promise<WorkTaskEligibilityResult> {
  const workTask = await findWorkTask(workTaskId);
  if (!workTask || !workTask.isActive) {
    return { ok: false, error: "Selected work type is not available." };
  }
  return { ok: true, workTask };
}

export function assertWorkTaskAllowedForClient(params: {
  client: ClientWithApprovals;
  workTaskId: string;
  allowAdminOverride?: boolean;
}): { ok: true } | { ok: false; error: string } {
  return assertWorkTaskEligibleForClient(params);
}

export function isRequestBasedPricingComplete(
  request: Pick<SupportRequest, "handoffTier" | "pricingMode" | "flatPriceCents">,
): boolean {
  if (!request.handoffTier || !request.pricingMode) {
    return false;
  }
  if (request.pricingMode === PricingMode.FLAT) {
    return typeof request.flatPriceCents === "number" && request.flatPriceCents > 0;
  }
  return true;
}

export type RequestPricingState =
  | "pending_review"
  | "fixed_fee_ready"
  | "hourly_ready"
  | "invalid";

export function getRequestPricingState(
  request: Pick<SupportRequest, "handoffTier" | "pricingMode" | "flatPriceCents">,
): RequestPricingState {
  if (!request.handoffTier || !request.pricingMode) {
    return "pending_review";
  }
  if (request.pricingMode === PricingMode.FLAT) {
    return typeof request.flatPriceCents === "number" && request.flatPriceCents > 0
      ? "fixed_fee_ready"
      : "invalid";
  }
  if (
    request.pricingMode === PricingMode.HOURLY ||
    request.pricingMode === PricingMode.REVIEW_THEN_HOURLY
  ) {
    return "hourly_ready";
  }
  return "invalid";
}

export function getRequestPricingStateLabel(state: RequestPricingState): string {
  switch (state) {
    case "fixed_fee_ready":
      return PRODUCT_LANGUAGE.engagement.fixedFeeApproved;
    case "hourly_ready":
      return PRODUCT_LANGUAGE.engagement.hourlyApproved;
    case "pending_review":
      return PRODUCT_LANGUAGE.engagement.pricingPending;
    case "invalid":
      return PRODUCT_LANGUAGE.engagement.pricingNeedsFix;
    default:
      return PRODUCT_LANGUAGE.engagement.pricingPending;
  }
}

export function formatHandoffTier(tier: HandoffTier | null | undefined): string {
  switch (tier) {
    case HandoffTier.CLEAN:
      return "Clean handoff";
    case HandoffTier.MESSY:
      return "Messy handoff";
    case HandoffTier.RECOVERY:
      return "Recovery handoff";
    default:
      return "Pending review";
  }
}

export function formatPricingMode(mode: PricingMode | null | undefined): string {
  switch (mode) {
    case PricingMode.FLAT:
      return "Flat fee";
    case PricingMode.HOURLY:
      return "Hourly";
    case PricingMode.REVIEW_THEN_HOURLY:
      return "Review first, then hourly";
    default:
      return PRODUCT_LANGUAGE.engagement.pricingPending;
  }
}

export function formatFlatPrice(cents: number | null | undefined): string {
  if (cents == null || cents <= 0) return "";
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(cents / 100);
}

export function getEngagementLabel(type: EngagementType): string {
  return type === EngagementType.SUPPORT_BLOCK
    ? PRODUCT_LANGUAGE.engagement.supportBlock
    : PRODUCT_LANGUAGE.engagement.requestBased;
}

export const PORTAL_INVITE_SCOPE_ERROR = PRODUCT_LANGUAGE.supportSetup.inviteScopeBlocked;

export type PortalInviteReadinessResult =
  | { ready: true }
  | { ready: false; error: string };

export function checkPortalInviteReadiness(
  client: ClientWithApprovals,
): PortalInviteReadinessResult {
  const activeModels = getActiveServiceModelTypes({
    serviceModels: client.serviceModels,
    engagementType: client.engagementType,
  });
  if (hasServiceModel(activeModels, "REQUEST_BASED")) {
    return { ready: true };
  }
  return checkPortalInviteReadinessByCount(
    client.engagementType,
    getApprovedWorkTaskIds(client).length,
  );
}

export function checkPortalInviteReadinessByCount(
  engagementType: EngagementType,
  approvedWorkTaskCount: number,
): PortalInviteReadinessResult {
  if (engagementType === EngagementType.REQUEST_BASED) {
    return { ready: true };
  }

  if (approvedWorkTaskCount === 0) {
    return { ready: false, error: PORTAL_INVITE_SCOPE_ERROR };
  }

  return { ready: true };
}

export function canSubmitPortalWork(client: ClientWithApprovals): {
  canSubmit: boolean;
  blockMessage?: string;
} {
  const activeModels = getActiveServiceModelTypes({
    serviceModels: client.serviceModels,
    engagementType: client.engagementType,
  });
  if (hasServiceModel(activeModels, "REQUEST_BASED")) {
    return { canSubmit: true };
  }

  const approvedCount = getApprovedWorkTaskIds(client).length;
  if (approvedCount === 0) {
    return {
      canSubmit: false,
      blockMessage:
        "Your support areas are still being configured. Hargen will notify you when you can send work.",
    };
  }

  return { canSubmit: true };
}

export const REQUEST_BASED_PRICING_REQUIRED_ERROR =
  "Set handoff tier and pricing on this request before continuing billable work.";
export const REQUEST_BASED_PAYMENT_REQUIRED_ERROR =
  "Collect or waive fixed-fee payment on this request before continuing billable work.";

export function assertRequestBasedBillableWorkAllowed(params: {
  engagementType: EngagementType;
  request: Pick<
    SupportRequest,
    "handoffTier" | "pricingMode" | "flatPriceCents" | "paymentStatus"
  >;
  billableType: BillableType;
}): { ok: true } | { ok: false; error: string } {
  const { engagementType, request, billableType } = params;

  if (engagementType !== EngagementType.REQUEST_BASED) {
    return { ok: true };
  }

  if (billableType === BillableType.NON_BILLABLE) {
    return { ok: true };
  }

  if (!isRequestBasedPricingComplete(request)) {
    return { ok: false, error: REQUEST_BASED_PRICING_REQUIRED_ERROR };
  }

  if (
    request.pricingMode === PricingMode.FLAT &&
    request.paymentStatus !== RequestPaymentStatus.PAID &&
    request.paymentStatus !== RequestPaymentStatus.WAIVED
  ) {
    return { ok: false, error: REQUEST_BASED_PAYMENT_REQUIRED_ERROR };
  }

  return { ok: true };
}
