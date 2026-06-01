import "server-only";

import { createHash } from "node:crypto";
import { put } from "@vercel/blob";
import { renderToBuffer } from "@react-pdf/renderer";
import { prisma } from "@/lib/prisma";
import { assertPrivateBlobReady } from "@/lib/agreements/blob-guard";
import { AgreementPacketPdfDocument } from "@/lib/agreements/pdf";
import type { SignedAcceptanceRecord } from "@/lib/agreements/sections";
import type { AgreementPacketSnapshot } from "@/lib/agreements/types";

export async function renderAgreementPacketPdfBuffer(input: {
  snapshot: AgreementPacketSnapshot;
  acceptances?: SignedAcceptanceRecord[];
}): Promise<Buffer> {
  const element = AgreementPacketPdfDocument({
    snapshot: input.snapshot,
    acceptances: input.acceptances,
  });
  const buffer = await renderToBuffer(element);
  return Buffer.from(buffer);
}

export async function storeAgreementPdf(input: {
  packetId: string;
  snapshot: AgreementPacketSnapshot;
  variant: "unsigned" | "signed";
  acceptances?: SignedAcceptanceRecord[];
}): Promise<{ fileId: string; sha256Hash: string }> {
  assertPrivateBlobReady();

  const pdfBuffer = await renderAgreementPacketPdfBuffer({
    snapshot: input.snapshot,
    acceptances: input.variant === "signed" ? input.acceptances : undefined,
  });
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

export async function storeUploadedAgreementPdf(input: {
  packetId: string;
  pdfBuffer: Buffer;
  fileLabel?: string;
}): Promise<{ fileId: string; sha256Hash: string }> {
  assertPrivateBlobReady();

  const sha256Hash = createHash("sha256").update(input.pdfBuffer).digest("hex");
  const timestamp = Date.now();
  const fileName = `signed-upload-${timestamp}.pdf`;
  const storageKey = `agreements/${input.packetId}/${fileName}`;

  const blob = await put(storageKey, input.pdfBuffer, {
    access: "private",
    addRandomSuffix: false,
    contentType: "application/pdf",
  });

  const file = await prisma.agreementFile.create({
    data: {
      storageKey,
      storageUrl: blob.url,
      fileName:
        input.fileLabel ??
        `agreement-packet-${input.packetId}-signed-upload.pdf`,
      contentType: "application/pdf",
      sizeBytes: input.pdfBuffer.byteLength,
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
