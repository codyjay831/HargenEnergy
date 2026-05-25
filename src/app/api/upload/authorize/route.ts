import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { isBlobStorageConfigured } from "@/lib/storage/config";
import { resolveUploadAuthorization } from "@/lib/storage/upload-auth";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  try {
    if (!isBlobStorageConfigured()) {
      return NextResponse.json(
        { error: "File uploads are not configured. Contact support." },
        { status: 503 },
      );
    }

    const session = await auth();

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const result = resolveUploadAuthorization(session, body);

    if (!result.ok) {
      return NextResponse.json({ error: result.error }, { status: result.status });
    }

    return NextResponse.json({ success: true, pathname: result.pathname });
  } catch (error) {
    console.error("Upload authorize error:", error);
    return NextResponse.json({ error: "Failed to authorize upload" }, { status: 500 });
  }
}
