import "server-only";

import { createHash } from "node:crypto";
import { put } from "@vercel/blob";
import { renderToBuffer } from "@react-pdf/renderer";
import { prisma } from "@/lib/prisma";
import { assertPrivateBlobReady } from "@/lib/agreements/blob-guard";
import { AgreementPacketPdfDocument } from "@/lib/agreements/pdf";
import type { AgreementPacketSnapshot } from "@/lib/agreements/types";

export async function renderAgreementPacketPdfBuffer(
  snapshot: AgreementPacketSnapshot,
): Promise<Buffer> {
  const element = AgreementPacketPdfDocument({ snapshot });
  const buffer = await renderToBuffer(element);
  return Buffer.from(buffer);
}

export async function storeAgreementPdf(input: {
  packetId: string;
  snapshot: AgreementPacketSnapshot;
  variant: "unsigned" | "signed";
}): Promise<{ fileId: string; sha256Hash: string }> {
  assertPrivateBlobReady();

  const pdfBuffer = await renderAgreementPacketPdfBuffer(input.snapshot);
  const sha256Hash = createHash("sha256").update(pdfBuffer).digest("hex");
  const timestamp = Date.now();
  const fileName = `${input.variant}-${timestamp}.pdf`;
  const storageKey = `agreements/${input.packetId}/${fileName}`;

  const blob = await put(storageKey, pdfBuffer, {
    access: "private",
    addRandomSuffix: false,
    contentType: "application/pdf",
  });

  const file = await prisma.agreementFile.create({
    data: {
      storageKey,
      storageUrl: blob.url,
      fileName: `agreement-packet-${input.packetId}-${input.variant}.pdf`,
      contentType: "application/pdf",
      sizeBytes: pdfBuffer.byteLength,
      sha256Hash,
    },
  });

  return { fileId: file.id, sha256Hash };
}

export async function getAgreementPdfFileForPacket(
  packetId: string,
  variant: "unsigned" | "signed",
) {
  const packet = await prisma.agreementPacket.findUnique({
    where: { id: packetId },
    select: {
      id: true,
      unsignedPdfFileId: true,
      signedPdfFileId: true,
      unsignedPdfFile: true,
      signedPdfFile: true,
    },
  });

  if (!packet) {
    return null;
  }

  if (variant === "unsigned") {
    return packet.unsignedPdfFile;
  }
  return packet.signedPdfFile;
}
