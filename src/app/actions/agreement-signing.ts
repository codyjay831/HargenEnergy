"use server";

import { headers } from "next/headers";
import { revalidatePath } from "next/cache";
import {
  AgreementAcceptanceKind,
  AgreementPacketStatus,
  AgreementSigningLinkStatus,
} from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";
import { writeAuditLog } from "@/lib/audit-log";
import {
  acceptanceKindForIndex,
  buildSignedAcceptanceRecordsFromSnapshot,
} from "@/lib/agreements/acceptance-records";
import {
  AGREEMENT_EVENT_TYPES,
  writeAgreementPacketEvent,
} from "@/lib/agreements/events";
import { getPrivateBlobErrorMessage } from "@/lib/agreements/blob-guard";
import {
  markSigningLinkOpened,
  resolveSigningLinkByRawToken,
} from "@/lib/agreements/signing-links";
import { storeAgreementPdf } from "@/lib/agreements/storage";
import { canAcceptOnline } from "@/lib/agreements/status";
import { getRequestIpFromHeaders, rateLimit } from "@/lib/rate-limit";

export async function recordAgreementSigningPageView(rawToken: string) {
  const resolved = await resolveSigningLinkByRawToken(rawToken);
  if (!resolved.ok) {
    return { error: resolved.error };
  }

  if (resolved.data.link.status === AgreementSigningLinkStatus.ACTIVE) {
    await markSigningLinkOpened(resolved.data.link.id);
  }

  return { success: true };
}

export async function acceptAgreementPacketOnline(input: {
  rawToken: string;
  acceptClientServices: boolean;
  acceptWorkAuthorization: boolean;
}) {
  if (!input.acceptClientServices || !input.acceptWorkAuthorization) {
    return { error: "Both acceptance checkboxes are required." };
  }

  const h = await headers();
  const ip = getRequestIpFromHeaders(h);
  const rateKey = `agreement-sign:${ip ?? "unknown"}`;
  const limited = await rateLimit("agreement-signing", rateKey);
  if (!limited.allowed) {
    return { error: "Too many attempts. Please try again later." };
  }

  const resolved = await resolveSigningLinkByRawToken(input.rawToken);
  if (!resolved.ok) {
    return { error: resolved.error };
  }

  const { link, packet, snapshot } = resolved.data;

  if (link.status !== AgreementSigningLinkStatus.ACTIVE) {
    return { error: "This signing link has already been used or is no longer active." };
  }

  if (!canAcceptOnline(packet.status)) {
    return { error: "This agreement packet cannot be signed at this time." };
  }

  const signedAt = new Date();
  const userAgent = h.get("user-agent")?.trim() || null;

  const acceptanceRows = snapshot.acceptanceBlocks.map((block, index) => ({
    acceptanceType: acceptanceKindForIndex(index),
    signerName: snapshot.signerName,
    signerTitle: snapshot.signerTitle,
    signerEmail: snapshot.signerEmail,
    checkboxText: block.checkboxText,
    signedAt,
    ipAddress: ip,
    userAgent,
    source: "online",
  }));

  try {
    await prisma.$transaction(async (tx) => {
      for (const row of acceptanceRows) {
        await tx.agreementPacketAcceptance.create({
          data: {
            agreementPacketId: packet.id,
            acceptanceType: row.acceptanceType as AgreementAcceptanceKind,
            signerName: row.signerName,
            signerTitle: row.signerTitle,
            signerEmail: row.signerEmail,
            checkboxText: row.checkboxText,
            signedAt: row.signedAt,
            ipAddress: row.ipAddress,
            userAgent: row.userAgent,
            source: row.source,
          },
        });
      }

      await tx.agreementSigningLink.update({
        where: { id: link.id },
        data: {
          status: AgreementSigningLinkStatus.USED,
          usedAt: signedAt,
        },
      });

      const current = await tx.agreementPacket.findUnique({
        where: { id: packet.id },
        select: { viewedAt: true },
      });

      await tx.agreementPacket.update({
        where: { id: packet.id },
        data: {
          status: AgreementPacketStatus.SIGNED,
          signedAt,
          viewedAt: current?.viewedAt ?? signedAt,
        },
      });
    });

    const signedRecords = buildSignedAcceptanceRecordsFromSnapshot(snapshot, signedAt);
    const { fileId, sha256Hash } = await storeAgreementPdf({
      packetId: packet.id,
      snapshot,
      variant: "signed",
      acceptances: signedRecords,
    });

    await prisma.agreementPacket.update({
      where: { id: packet.id },
      data: { signedPdfFileId: fileId },
    });

    await writeAgreementPacketEvent({
      agreementPacketId: packet.id,
      eventType: AGREEMENT_EVENT_TYPES.SIGNED,
      actorEmail: snapshot.signerEmail,
      metadata: { linkId: link.id, ip, sha256Hash },
    });

    await writeAgreementPacketEvent({
      agreementPacketId: packet.id,
      eventType: AGREEMENT_EVENT_TYPES.SIGNING_LINK_USED,
      actorEmail: snapshot.signerEmail,
      metadata: { linkId: link.id },
    });

    await writeAgreementPacketEvent({
      agreementPacketId: packet.id,
      eventType: AGREEMENT_EVENT_TYPES.PDF_GENERATED,
      metadata: { variant: "signed", sha256Hash, fileId },
    });

    await writeAuditLog({
      action: "agreement_packet.signed_online",
      entityType: "AgreementPacket",
      entityId: packet.id,
      metadata: { linkId: link.id, signerEmail: snapshot.signerEmail },
    });

    revalidatePath(`/admin/agreements/${packet.id}`);
    revalidatePath("/admin/agreements");

    return { success: true, packetId: packet.id };
  } catch (error) {
    console.error("acceptAgreementPacketOnline:", error);
    return { error: getPrivateBlobErrorMessage(error) };
  }
}
