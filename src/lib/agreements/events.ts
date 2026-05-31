import "server-only";

import { prisma } from "@/lib/prisma";
import type { Prisma } from "@/generated/prisma/client";

export type AgreementEventInput = {
  agreementPacketId: string;
  eventType: string;
  actorUserId?: string | null;
  actorEmail?: string | null;
  metadata?: Record<string, unknown> | null;
};

export async function writeAgreementPacketEvent(input: AgreementEventInput): Promise<void> {
  const metadata =
    input.metadata == null ? undefined : (input.metadata as Prisma.InputJsonValue);

  await prisma.agreementPacketEvent.create({
    data: {
      agreementPacketId: input.agreementPacketId,
      eventType: input.eventType,
      actorUserId: input.actorUserId ?? null,
      actorEmail: input.actorEmail ?? null,
      metadataJson: metadata,
    },
  });
}

export const AGREEMENT_EVENT_TYPES = {
  CREATED: "packet.created",
  UPDATED: "packet.updated",
  SNAPSHOT_CREATED: "packet.snapshot_created",
  PDF_GENERATED: "packet.pdf_generated",
  RETURNED_TO_DRAFT: "packet.returned_to_draft",
  SENT_MANUALLY: "packet.sent_manually",
  VOIDED: "packet.voided",
  SUPERSEDED: "packet.superseded",
} as const;
