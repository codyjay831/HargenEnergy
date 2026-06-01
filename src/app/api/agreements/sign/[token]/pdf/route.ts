import { NextRequest, NextResponse } from "next/server";
import { get } from "@vercel/blob";
import { AgreementSigningLinkStatus } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";
import { assertPrivateBlobReady } from "@/lib/agreements/blob-guard";
import { resolveSigningLinkByRawToken } from "@/lib/agreements/signing-links";
import { isBlobStorageConfigured } from "@/lib/storage/config";

export const dynamic = "force-dynamic";

export async function GET(
  _request: NextRequest,
  context: { params: Promise<{ token: string }> },
) {
  try {
    if (!isBlobStorageConfigured()) {
      return NextResponse.json(
        { error: "Private file storage is not configured." },
        { status: 503 },
      );
    }

    assertPrivateBlobReady();

    const { token } = await context.params;
    const resolved = await resolveSigningLinkByRawToken(token);
    if (!resolved.ok) {
      return NextResponse.json({ error: resolved.error }, { status: 404 });
    }

    if (resolved.data.link.status !== AgreementSigningLinkStatus.USED) {
      return NextResponse.json(
        { error: "Signed PDF is available after the agreement is signed." },
        { status: 403 },
      );
    }

    const packet = await prisma.agreementPacket.findUnique({
      where: { id: resolved.data.packet.id },
      select: { signedPdfFile: true },
    });

    const file = packet?.signedPdfFile;
    if (!file) {
      return NextResponse.json({ error: "Signed PDF not found." }, { status: 404 });
    }

    const result = await get(file.storageUrl, { access: "private" });
    if (!result || result.statusCode !== 200 || !result.stream) {
      return NextResponse.json({ error: "PDF file not found in storage." }, { status: 404 });
    }

    const filename = file.fileName.replace(/"/g, "");
    const headers = new Headers({
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Cache-Control": "private, no-store",
    });

    if (result.blob.size != null) {
      headers.set("Content-Length", String(result.blob.size));
    }

    return new NextResponse(result.stream, { headers });
  } catch (error) {
    console.error("Agreement signing PDF download error:", error);
    return NextResponse.json({ error: "Failed to download signed PDF." }, { status: 500 });
  }
}
