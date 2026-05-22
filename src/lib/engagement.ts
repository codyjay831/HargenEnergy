import {
  EngagementType,
  HandoffTier,
  PricingMode,
  type Client,
  type SupportRequest,
  type WorkTask,
} from "@/generated/prisma/client";

export type ClientWithApprovals = Client & {
  approvedWorkTasks?: { workTaskId: string }[];
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
  const { client, workTaskId, allowAdminOverride } = params;

  if (allowAdminOverride) {
    return { ok: true };
  }

  if (client.engagementType === EngagementType.ONE_OFF) {
    return { ok: true };
  }

  const approvedIds = getApprovedWorkTaskIds(client);
  if (approvedIds.length === 0) {
    return {
      ok: false,
      error:
        "Your support areas are still being configured. Contact Hargen before sending work.",
    };
  }

  if (!approvedIds.includes(workTaskId)) {
    return {
      ok: false,
      error: "That work type is not in your approved support areas.",
    };
  }

  return { ok: true };
}

export function isOneOffPricingComplete(
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
      return "Pricing pending review";
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
  return type === EngagementType.BLOCK_SUPPORT
    ? "Hourly support block"
    : "One-off work";
}

export function canSubmitPortalWork(client: ClientWithApprovals): {
  canSubmit: boolean;
  blockMessage?: string;
} {
  if (client.engagementType === EngagementType.ONE_OFF) {
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
