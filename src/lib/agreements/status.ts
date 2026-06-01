import type { AgreementPacketStatus } from "@/generated/prisma/client";
import { IMMUTABLE_STATUSES } from "@/lib/agreements/types";

export const PACKET_STATUS_LABELS: Record<AgreementPacketStatus, string> = {
  DRAFT: "Draft",
  READY: "Ready to send",
  SENT: "Sent",
  VIEWED: "Viewed",
  SIGNED: "Signed",
  ACTIVE: "Active",
  VOIDED: "Voided",
  SUPERSEDED: "Superseded",
  EXPIRED: "Expired",
};

export function isPacketImmutable(status: AgreementPacketStatus): boolean {
  return IMMUTABLE_STATUSES.includes(status);
}

export function canEditPacketDraft(status: AgreementPacketStatus): boolean {
  return status === "DRAFT";
}

export function hasFrozenSnapshot(status: AgreementPacketStatus): boolean {
  return status !== "DRAFT";
}

export function canGeneratePacket(status: AgreementPacketStatus): boolean {
  return status === "DRAFT";
}

export function canMarkSentManually(status: AgreementPacketStatus): boolean {
  return status === "READY";
}

export function canReturnToDraft(status: AgreementPacketStatus): boolean {
  return status === "READY" || status === "SENT";
}

export function canReturnToDraftWithGuards(input: {
  status: AgreementPacketStatus;
  hasViewed: boolean;
  hasUsedSigningLink: boolean;
  hasAcceptances: boolean;
}): boolean {
  if (!canReturnToDraft(input.status)) {
    return false;
  }
  if (input.hasViewed || input.hasUsedSigningLink || input.hasAcceptances) {
    return false;
  }
  return true;
}

export function canCreateSigningLink(status: AgreementPacketStatus): boolean {
  if (isPacketImmutable(status)) {
    return false;
  }
  return status === "READY" || status === "SENT" || status === "VIEWED";
}

export function canMarkManuallySigned(status: AgreementPacketStatus): boolean {
  if (isPacketImmutable(status)) {
    return false;
  }
  return status === "READY" || status === "SENT" || status === "VIEWED";
}

export function canAcceptOnline(status: AgreementPacketStatus): boolean {
  return status === "READY" || status === "SENT" || status === "VIEWED";
}

export function canVoidPacket(status: AgreementPacketStatus): boolean {
  return !isPacketImmutable(status);
}

export function canSupersedePacket(status: AgreementPacketStatus): boolean {
  return status === "READY" || status === "SENT" || status === "SIGNED" || status === "ACTIVE";
}

export function packetStatusBadgeClass(status: AgreementPacketStatus): string {
  switch (status) {
    case "DRAFT":
      return "border-slate-200 bg-slate-50 text-slate-700";
    case "READY":
      return "border-blue-200 bg-blue-50 text-blue-800";
    case "SENT":
      return "border-purple-200 bg-purple-50 text-purple-800";
    case "VIEWED":
      return "border-sky-200 bg-sky-50 text-sky-800";
    case "SIGNED":
    case "ACTIVE":
      return "border-emerald-200 bg-emerald-50 text-emerald-800";
    case "VOIDED":
      return "border-red-200 bg-red-50 text-red-800";
    case "SUPERSEDED":
      return "border-slate-200 bg-slate-100 text-slate-500";
    case "EXPIRED":
      return "border-amber-200 bg-amber-50 text-amber-900";
    default:
      return "border-slate-200 bg-white text-slate-600";
  }
}
