import { AgreementStatus } from "@/generated/prisma/client";
import { getSubmitBlockerCopy } from "@/lib/submit-blockers";

export type AgreementBlockReason = "agreement_pending";

export type ClientAgreementFields = {
  agreementStatus: AgreementStatus;
  agreementSentAt: Date | null;
  agreementSignedAt: Date | null;
  agreementUrl: string | null;
  agreementNotes: string | null;
  agreementOverrideReason: string | null;
};

export type AgreementNextAction =
  | "mark_sent"
  | "mark_signed"
  | "view_url"
  | "none";

export type AgreementReadiness = {
  ready: boolean;
  reasonCode?: AgreementBlockReason;
  message?: string;
  status: AgreementStatus;
  statusLabel: string;
  nextAction: AgreementNextAction;
  portalMessage: string;
  adminMessage: string;
  effectiveAt: Date | null;
};

export const AGREEMENT_STATUS_LABELS: Record<AgreementStatus, string> = {
  [AgreementStatus.NOT_SENT]: "Not sent",
  [AgreementStatus.SENT]: "Sent — awaiting signature",
  [AgreementStatus.SIGNED]: "Signed",
  [AgreementStatus.WAIVED]: "Waived",
};

export function isAgreementSatisfied(status: AgreementStatus): boolean {
  return status === AgreementStatus.SIGNED || status === AgreementStatus.WAIVED;
}

export function hasUsableAgreementUrl(value: string | null | undefined): boolean {
  const trimmed = value?.trim();
  if (!trimmed) {
    return false;
  }
  try {
    new URL(trimmed);
    return true;
  } catch {
    return false;
  }
}

function getAgreementNextAction(
  status: AgreementStatus,
  agreementUrl: string | null | undefined,
): AgreementNextAction {
  if (status === AgreementStatus.NOT_SENT) {
    return "mark_sent";
  }
  if (status === AgreementStatus.SENT) {
    return agreementUrl?.trim() ? "view_url" : "mark_signed";
  }
  return "none";
}

export function getClientAgreementReadiness(
  client: Pick<
    ClientAgreementFields,
    | "agreementStatus"
    | "agreementSentAt"
    | "agreementSignedAt"
    | "agreementUrl"
  >,
): AgreementReadiness {
  const portalMessage = getSubmitBlockerCopy("agreement_pending", "portal");
  const adminMessage = getSubmitBlockerCopy("agreement_pending", "admin");
  const statusLabel = AGREEMENT_STATUS_LABELS[client.agreementStatus];
  const nextAction = getAgreementNextAction(client.agreementStatus, client.agreementUrl);
  const effectiveAt =
    client.agreementSignedAt ?? client.agreementSentAt ?? null;

  if (isAgreementSatisfied(client.agreementStatus)) {
    return {
      ready: true,
      status: client.agreementStatus,
      statusLabel,
      nextAction,
      portalMessage,
      adminMessage,
      effectiveAt,
    };
  }

  return {
    ready: false,
    reasonCode: "agreement_pending",
    message: portalMessage,
    status: client.agreementStatus,
    statusLabel,
    nextAction,
    portalMessage,
    adminMessage,
    effectiveAt,
  };
}

export function getAdminAgreementBlockMessage(
  client: Pick<ClientAgreementFields, "agreementStatus">,
): string {
  if (isAgreementSatisfied(client.agreementStatus)) {
    return "";
  }
  return getSubmitBlockerCopy("agreement_pending", "admin");
}

const ALLOWED_TRANSITIONS: Record<AgreementStatus, AgreementStatus[]> = {
  [AgreementStatus.NOT_SENT]: [AgreementStatus.SENT, AgreementStatus.WAIVED],
  [AgreementStatus.SENT]: [
    AgreementStatus.SIGNED,
    AgreementStatus.NOT_SENT,
    AgreementStatus.WAIVED,
  ],
  [AgreementStatus.SIGNED]: [AgreementStatus.SENT, AgreementStatus.NOT_SENT],
  [AgreementStatus.WAIVED]: [AgreementStatus.NOT_SENT],
};

export function canTransitionAgreementStatus(
  from: AgreementStatus,
  to: AgreementStatus,
): boolean {
  if (from === to) {
    return true;
  }
  return ALLOWED_TRANSITIONS[from].includes(to);
}

export function validateAgreementTransition(input: {
  from: AgreementStatus;
  to: AgreementStatus;
  note?: string | null;
  overrideReason?: string | null;
  agreementUrl?: string | null;
}): { ok: true } | { ok: false; error: string } {
  const { from, to, note, overrideReason, agreementUrl } = input;

  if (from === to) {
    return { ok: true };
  }

  if (!canTransitionAgreementStatus(from, to)) {
    return {
      ok: false,
      error: `Cannot change agreement status from ${AGREEMENT_STATUS_LABELS[from]} to ${AGREEMENT_STATUS_LABELS[to]}.`,
    };
  }

  if (to === AgreementStatus.WAIVED && !overrideReason?.trim()) {
    return { ok: false, error: "A waiver reason is required." };
  }

  if (to === AgreementStatus.SIGNED && !hasUsableAgreementUrl(agreementUrl)) {
    return {
      ok: false,
      error: "A valid signed agreement URL is required before marking this agreement as signed.",
    };
  }

  const isBackward =
    (from === AgreementStatus.SIGNED &&
      (to === AgreementStatus.SENT || to === AgreementStatus.NOT_SENT)) ||
    (from === AgreementStatus.WAIVED && to === AgreementStatus.NOT_SENT);

  if (isBackward && !note?.trim()) {
    return { ok: false, error: "A note is required when reverting agreement status." };
  }

  if (agreementUrl != null && agreementUrl.trim() && !hasUsableAgreementUrl(agreementUrl)) {
    return { ok: false, error: "Agreement URL is not valid." };
  }

  return { ok: true };
}

export function buildAgreementUpdateData(input: {
  from: AgreementStatus;
  to: AgreementStatus;
  now?: Date;
  agreementUrl?: string | null;
  agreementNotes?: string | null;
  overrideReason?: string | null;
  signedAt?: Date | null;
}): Partial<ClientAgreementFields> {
  const now = input.now ?? new Date();
  const data: Partial<ClientAgreementFields> = {
    agreementStatus: input.to,
  };

  if (input.agreementUrl !== undefined) {
    data.agreementUrl = input.agreementUrl?.trim() || null;
  }

  if (input.agreementNotes !== undefined) {
    data.agreementNotes = input.agreementNotes?.trim() || null;
  }

  if (input.to === AgreementStatus.SENT) {
    data.agreementSentAt = now;
    data.agreementSignedAt = null;
    data.agreementOverrideReason = null;
  }

  if (input.to === AgreementStatus.SIGNED) {
    data.agreementSignedAt = input.signedAt ?? now;
    if (input.from !== AgreementStatus.SENT) {
      data.agreementSentAt = data.agreementSentAt ?? now;
    }
    data.agreementOverrideReason = null;
  }

  if (input.to === AgreementStatus.WAIVED) {
    data.agreementOverrideReason = input.overrideReason?.trim() || null;
    data.agreementSignedAt = null;
  }

  if (input.to === AgreementStatus.NOT_SENT) {
    data.agreementSentAt = null;
    data.agreementSignedAt = null;
    data.agreementOverrideReason = null;
  }

  return data;
}
