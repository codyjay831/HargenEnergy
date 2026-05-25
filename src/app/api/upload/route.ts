import { handleUpload, type HandleUploadBody } from "@vercel/blob/client";
import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { isBlobStorageConfigured } from "@/lib/storage/config";
import {
  ALLOWED_ATTACHMENT_TYPES,
  ALLOWED_LOGO_TYPES,
  MAX_FILE_SIZE_ATTACHMENT,
  MAX_FILE_SIZE_LOGO,
} from "@/lib/storage/limits";
import { assertPathnameAllowedForSession, type UploadType } from "@/lib/storage/upload-auth";

export const dynamic = "force-dynamic";

type ClientPayload = {
  type?: UploadType;
};

export async function POST(request: Request): Promise<NextResponse> {
  if (!isBlobStorageConfigured()) {
    return NextResponse.json(
      { error: "File uploads are not configured. Contact support." },
      { status: 503 },
    );
  }

  const body = (await request.json()) as HandleUploadBody;

  try {
    const jsonResponse = await handleUpload({
      body,
      request,
      onBeforeGenerateToken: async (pathname, clientPayload) => {
        const session = await auth();

        if (!session?.user) {
          throw new Error("Unauthorized");
        }

        const pathCheck = assertPathnameAllowedForSession(session, pathname);
        if (!pathCheck.ok) {
          throw new Error(pathCheck.error);
        }

        let uploadType: UploadType = pathname.startsWith("logos/") ? "logo" : "attachment";

        if (clientPayload) {
          try {
            const parsed = JSON.parse(clientPayload) as ClientPayload;
            if (parsed.type === "logo" || parsed.type === "attachment") {
              uploadType = parsed.type;
            }
          } catch {
            // Ignore malformed client payload; pathname is authoritative.
          }
        }

        const limits =
          uploadType === "logo"
            ? {
                allowedContentTypes: [...ALLOWED_LOGO_TYPES],
                maximumSizeInBytes: MAX_FILE_SIZE_LOGO,
              }
            : {
                allowedContentTypes: [...ALLOWED_ATTACHMENT_TYPES],
                maximumSizeInBytes: MAX_FILE_SIZE_ATTACHMENT,
              };

        return {
          ...limits,
          addRandomSuffix: false,
        };
      },
      onUploadCompleted: async () => {
        // Metadata is saved on form submit; no webhook handling in v1.
      },
    });

    return NextResponse.json(jsonResponse);
  } catch (error) {
    console.error("Upload handle error:", error);
    const message = error instanceof Error ? error.message : "Failed to handle upload";
    const status = message === "Unauthorized" || message === "Forbidden." ? 403 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
