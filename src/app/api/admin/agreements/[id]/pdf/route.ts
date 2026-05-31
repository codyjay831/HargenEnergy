import { NextRequest, NextResponse } from "next/server";
import { get } from "@vercel/blob";
import { auth } from "@/auth";
import { staffHasCapability, resolveStaffRole } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";
import { isBlobStorageConfigured } from "@/lib/storage/config";
import { assertPrivateBlobReady } from "@/lib/agreements/blob-guard";

export const dynamic = "force-dynamic";

type PdfVariant = "unsigned" | "signed";

function isPdfVariant(value: string | null): value is PdfVariant {
  return value === "unsigned" || value === "signed";
}

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const session = await auth();
    if (
      !session?.user ||
      session.user.role !== "ADMIN" ||
      !staffHasCapability(resolveStaffRole(session.user.staffRole ?? null), "clients.manage")
    ) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (!isBlobStorageConfigured()) {
      return NextResponse.json(
        { error: "Private file storage is not configured." },
        { status: 503 },
      );
    }

    assertPrivateBlobReady();

    const { id: packetId } = await context.params;
    const variantParam = request.nextUrl.searchParams.get("variant");
    const variant: PdfVariant = isPdfVariant(variantParam) ? variantParam : "unsigned";

    const packet = await prisma.agreementPacket.findUnique({
      where: { id: packetId },
      select: {
        id: true,
        unsignedPdfFile: true,
        signedPdfFile: true,
      },
    });

    if (!packet) {
      return NextResponse.json({ error: "Agreement packet not found." }, { status: 404 });
    }

    const file = variant === "unsigned" ? packet.unsignedPdfFile : packet.signedPdfFile;
    if (!file) {
      return NextResponse.json({ error: "PDF not available for this packet." }, { status: 404 });
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
    console.error("Agreement PDF download error:", error);
    return NextResponse.json({ error: "Failed to download agreement PDF." }, { status: 500 });
  }
}
