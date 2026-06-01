import "server-only";

import {
  AgreementAcceptanceKind,
  AgreementPacketStatus,
  AgreementSigningLinkStatus,
} from "@/generated/prisma/client";
import { encryptFieldValue, decryptFieldValue } from "@/lib/crypto/field-encryption";
import { prisma } from "@/lib/prisma";
import {
  AGREEMENT_EVENT_TYPES,
  writeAgreementPacketEvent,
} from "@/lib/agreements/events";
import { parseStoredSnapshot } from "@/lib/agreements/snapshot";
import { isPacketImmutable } from "@/lib/agreements/status";
import {
  buildAgreementSigningUrl,
  buildSigningLinkExpiry,
  createSigningRawToken,
  hashSigningToken,
  isSigningLinkExpired,
} from "@/lib/agreements/tokens";

const SIGNABLE_STATUSES: AgreementPacketStatus[] = [
  AgreementPacketStatus.READY,
  AgreementPacketStatus.SENT,
  AgreementPacketStatus.VIEWED,
];

export type CreateSigningLinkInput = {
  agreementPacketId: string;
  createdByUserId?: string | null;
  regenerate?: boolean;
};

export type CreateSigningLinkResult =
  | { signingUrl: string; linkId: string; expiresAt: Date }
  | { error: string };

export type ResolvedSigningLink = {
  link: {
    id: string;
    agreementPacketId: string;
    status: AgreementSigningLinkStatus;
    expiresAt: Date;
    openedAt: Date | null;
    usedAt: Date | null;
  };
  packet: {
    id: string;
    status: AgreementPacketStatus;
    acceptanceSnapshotJson: unknown;
    signedPdfFileId: string | null;
  };
  snapshot: NonNullable<ReturnType<typeof parseStoredSnapshot>>;
};

async function revokeActiveLinks(
  agreementPacketId: string,
  actorUserId?: string | null,
) {
  const active = await prisma.agreementSigningLink.findMany({
    where: {
      agreementPacketId,
      status: AgreementSigningLinkStatus.ACTIVE,
    },
    select: { id: true },
  });

  if (active.length === 0) {
    return;
  }

  const now = new Date();
  await prisma.agreementSigningLink.updateMany({
    where: {
      agreementPacketId,
      status: AgreementSigningLinkStatus.ACTIVE,
    },
    data: {
      status: AgreementSigningLinkStatus.REVOKED,
      revokedAt: now,
    },
  });

  for (const link of active) {
    await writeAgreementPacketEvent({
      agreementPacketId,
      eventType: AGREEMENT_EVENT_TYPES.SIGNING_LINK_REVOKED,
      actorUserId,
      metadata: { linkId: link.id, reason: "superseded_by_new_link" },
    });
  }
}

export async function createAgreementSigningLink(
  input: CreateSigningLinkInput,
): Promise<CreateSigningLinkResult> {
  const packet = await prisma.agreementPacket.findUnique({
    where: { id: input.agreementPacketId },
    select: {
      id: true,
      status: true,
      acceptanceSnapshotJson: true,
    },
  });

  if (!packet) {
    return { error: "Agreement packet not found." };
  }

  if (isPacketImmutable(packet.status)) {
    return { error: "This packet cannot accept a signing link." };
  }

  if (!packet.acceptanceSnapshotJson || !parseStoredSnapshot(packet.acceptanceSnapshotJson)) {
    return {
      error: "Generate the packet and freeze the legal snapshot before creating a signing link.",
    };
  }

  if (!SIGNABLE_STATUSES.includes(packet.status)) {
    return {
      error: "Signing links can only be created for ready, sent, or viewed packets.",
    };
  }

  const existingActive = await prisma.agreementSigningLink.findFirst({
    where: {
      agreementPacketId: packet.id,
      status: AgreementSigningLinkStatus.ACTIVE,
    },
  });

  if (existingActive && !input.regenerate) {
    const rawToken = decryptFieldValue(existingActive.encryptedToken);
    if (!rawToken) {
      return { error: "Active link exists but URL is unavailable. Regenerate the link." };
    }
    if (isSigningLinkExpired(existingActive.expiresAt)) {
      return { error: "Active link has expired. Regenerate the link." };
    }
    return {
      signingUrl: buildAgreementSigningUrl(rawToken),
      linkId: existingActive.id,
      expiresAt: existingActive.expiresAt,
    };
  }

  if (input.regenerate || existingActive) {
    await revokeActiveLinks(packet.id, input.createdByUserId);
  }

  const rawToken = createSigningRawToken();
  const expiresAt = buildSigningLinkExpiry();

  const link = await prisma.agreementSigningLink.create({
    data: {
      agreementPacketId: packet.id,
      tokenHash: hashSigningToken(rawToken),
      encryptedToken: encryptFieldValue(rawToken),
      status: AgreementSigningLinkStatus.ACTIVE,
      expiresAt,
      createdByUserId: input.createdByUserId ?? null,
    },
  });

  await writeAgreementPacketEvent({
    agreementPacketId: packet.id,
    eventType: AGREEMENT_EVENT_TYPES.SIGNING_LINK_CREATED,
    actorUserId: input.createdByUserId,
    metadata: { linkId: link.id, expiresAt: expiresAt.toISOString() },
  });

  return {
    signingUrl: buildAgreementSigningUrl(rawToken),
    linkId: link.id,
    expiresAt,
  };
}

export async function resolveSigningLinkByRawToken(
  rawToken: string,
): Promise<{ ok: true; data: ResolvedSigningLink } | { ok: false; error: string }> {
  const trimmed = rawToken?.trim();
  if (!trimmed) {
    return { ok: false, error: "Invalid signing link." };
  }

  const link = await prisma.agreementSigningLink.findUnique({
    where: { tokenHash: hashSigningToken(trimmed) },
    include: {
      agreementPacket: {
        select: {
          id: true,
          status: true,
          acceptanceSnapshotJson: true,
          signedPdfFileId: true,
        },
      },
    },
  });

  if (!link) {
    return { ok: false, error: "This signing link is invalid or has expired." };
  }

  if (link.status === AgreementSigningLinkStatus.REVOKED) {
    return { ok: false, error: "This signing link has been revoked." };
  }

  if (
    link.status !== AgreementSigningLinkStatus.ACTIVE &&
    link.status !== AgreementSigningLinkStatus.USED
  ) {
    return { ok: false, error: "This signing link is no longer available." };
  }

  if (isSigningLinkExpired(link.expiresAt)) {
    if (link.status === AgreementSigningLinkStatus.ACTIVE) {
      await prisma.agreementSigningLink.update({
        where: { id: link.id },
        data: { status: AgreementSigningLinkStatus.EXPIRED },
      });
      await writeAgreementPacketEvent({
        agreementPacketId: link.agreementPacketId,
        eventType: AGREEMENT_EVENT_TYPES.SIGNING_LINK_EXPIRED,
        metadata: { linkId: link.id },
      });
    }
    return { ok: false, error: "This signing link has expired." };
  }

  const snapshot = parseStoredSnapshot(link.agreementPacket.acceptanceSnapshotJson);
  if (!snapshot) {
    return { ok: false, error: "Agreement snapshot is missing for this packet." };
  }

  return {
    ok: true,
    data: {
      link: {
        id: link.id,
        agreementPacketId: link.agreementPacketId,
        status: link.status,
        expiresAt: link.expiresAt,
        openedAt: link.openedAt,
        usedAt: link.usedAt,
      },
      packet: link.agreementPacket,
      snapshot,
    },
  };
}

export async function markSigningLinkOpened(linkId: string): Promise<void> {
  const link = await prisma.agreementSigningLink.findUnique({
    where: { id: linkId },
    include: {
      agreementPacket: { select: { id: true, status: true, viewedAt: true } },
    },
  });

  if (!link || link.status !== AgreementSigningLinkStatus.ACTIVE) {
    return;
  }

  const now = new Date();
  const packetUpdates: {
    status?: AgreementPacketStatus;
    viewedAt?: Date;
  } = {};

  if (
    link.agreementPacket.status === AgreementPacketStatus.READY ||
    link.agreementPacket.status === AgreementPacketStatus.SENT
  ) {
    packetUpdates.status = AgreementPacketStatus.VIEWED;
    packetUpdates.viewedAt = now;
  }

  await prisma.$transaction([
    prisma.agreementSigningLink.update({
      where: { id: linkId },
      data: { openedAt: link.openedAt ?? now },
    }),
    ...(Object.keys(packetUpdates).length > 0
      ? [
          prisma.agreementPacket.update({
            where: { id: link.agreementPacketId },
            data: packetUpdates,
          }),
        ]
      : []),
  ]);

  if (!link.openedAt) {
    await writeAgreementPacketEvent({
      agreementPacketId: link.agreementPacketId,
      eventType: AGREEMENT_EVENT_TYPES.SIGNING_LINK_OPENED,
      metadata: { linkId },
    });
  }
}

export const AGREEMENT_ACCEPTANCE_KINDS: AgreementAcceptanceKind[] = [
  AgreementAcceptanceKind.CLIENT_SERVICES_AGREEMENT,
  AgreementAcceptanceKind.WORK_AUTHORIZATION,
];
