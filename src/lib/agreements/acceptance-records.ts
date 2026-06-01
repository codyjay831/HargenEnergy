import type { AgreementAcceptanceKind } from "@/generated/prisma/client";
import type { AgreementPacketSnapshot } from "@/lib/agreements/types";
import type { SignedAcceptanceRecord } from "@/lib/agreements/sections";

export function buildSignedAcceptanceRecordsFromSnapshot(
  snapshot: AgreementPacketSnapshot,
  signedAt: Date,
): SignedAcceptanceRecord[] {
  return snapshot.acceptanceBlocks.map((block, index) => ({
    acceptanceType:
      index === 0 ? "CLIENT_SERVICES_AGREEMENT" : "WORK_AUTHORIZATION",
    title: block.title,
    checkboxText: block.checkboxText,
    signerName: snapshot.signerName,
    signerTitle: snapshot.signerTitle,
    signerEmail: snapshot.signerEmail,
    signedAt,
  }));
}

export function acceptanceKindForIndex(index: number): AgreementAcceptanceKind {
  return index === 0 ? "CLIENT_SERVICES_AGREEMENT" : "WORK_AUTHORIZATION";
}
