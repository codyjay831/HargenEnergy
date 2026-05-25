import { handleUpload, type HandleUploadBody } from "@vercel/blob/client";
import { del, get } from "@vercel/blob";
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
import {
  isSniffedMimeAllowed,
  sniffMimeTypeFromBytes,
} from "@/lib/storage/content-sniff";

export const dynamic = "force-dynamic";

type ClientPayload = {
  type?: UploadType;
};

async function readSignatureBytes(
  stream: ReadableStream<Uint8Array>,
  max = 32,
): Promise<Uint8Array> {
  const reader = stream.getReader();
  const chunks: Uint8Array[] = [];
  let total = 0;
  try {
    while (total < max) {
      const { done, value } = await reader.read();
      if (done || !value) break;
      chunks.push(value);
      total += value.byteLength;
      if (total >= max) break;
    }
  } finally {
    await reader.cancel().catch(() => undefined);
  }

  const all = new Uint8Array(Math.min(total, max));
  let offset = 0;
  for (const chunk of chunks) {
    const copyLen = Math.min(chunk.byteLength, max - offset);
    all.set(chunk.subarray(0, copyLen), offset);
    offset += copyLen;
    if (offset >= max) break;
  }
  return all;
}

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
      onUploadCompleted: async ({ blob }) => {
        try {
          const result = await get(blob.url, {
            access: blob.pathname.startsWith("logos/") ? "public" : "private",
          });
          if (!result || !result.stream) {
            throw new Error("Uploaded blob stream unavailable for validation.");
          }

          const signature = await readSignatureBytes(result.stream);
          const sniffed = sniffMimeTypeFromBytes(signature);
          if (!isSniffedMimeAllowed(sniffed, blob.contentType)) {
            await del(blob.url).catch(() => undefined);
            throw new Error("Uploaded file content does not match declared file type.");
          }
        } catch (error) {
          console.error("Upload content validation failed:", error);
          throw error;
        }
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
