import { NextRequest, NextResponse } from "next/server";
import { get } from "@vercel/blob";
import { auth } from "@/auth";
import { assertCanReadBlobRef } from "@/lib/storage/access";
import { isBlobStorageConfigured } from "@/lib/storage/config";
import { isVercelBlobUrl } from "@/lib/storage/blob-ref";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    if (!isBlobStorageConfigured()) {
      return NextResponse.json(
        { error: "File storage is not configured." },
        { status: 503 },
      );
    }

    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const blobUrl = request.nextUrl.searchParams.get("url")?.trim();
    if (!blobUrl || !isVercelBlobUrl(blobUrl)) {
      return NextResponse.json({ error: "Invalid url." }, { status: 400 });
    }

    const access = assertCanReadBlobRef(session.user, blobUrl);
    if (!access.ok) {
      return NextResponse.json({ error: access.error }, { status: 403 });
    }

    const result = await get(blobUrl, { access: "private" });
    if (!result || result.statusCode !== 200 || !result.stream) {
      return NextResponse.json({ error: "File not found." }, { status: 404 });
    }

    const { stream, blob } = result;
    const filename = blob.pathname.split("/").pop() ?? "file";
    const inline =
      blob.contentType.startsWith("image/") || blob.contentType === "application/pdf";

    const headers = new Headers({
      "Content-Type": blob.contentType,
      "Content-Disposition": `${inline ? "inline" : "attachment"}; filename="${filename.replace(/"/g, "")}"`,
      "Cache-Control": "private, max-age=3600",
    });

    if (blob.size != null) {
      headers.set("Content-Length", String(blob.size));
    }

    return new NextResponse(stream, { headers });
  } catch (error) {
    console.error("File read error:", error);
    return NextResponse.json({ error: "Failed to read file." }, { status: 500 });
  }
}
