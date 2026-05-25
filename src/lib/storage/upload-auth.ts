import "server-only";

import type { Session } from "next-auth";
import { generateStoragePath } from "@/lib/storage/paths";
import { validateServerUpload } from "@/lib/storage/validation";
import {
  ALLOWED_ATTACHMENT_TYPES,
  ALLOWED_LOGO_TYPES,
  MAX_FILE_SIZE_ATTACHMENT,
  MAX_FILE_SIZE_LOGO,
} from "@/lib/storage/limits";

const UPLOAD_SESSION_ID_REGEX = /^[a-zA-Z0-9_-]{8,128}$/;

export type UploadType = "attachment" | "logo";

export type UploadAuthorizeInput = {
  type: unknown;
  clientId?: unknown;
  requestId?: unknown;
  uploadSessionId?: unknown;
  fileName: unknown;
  contentType: unknown;
  contentLength: unknown;
};

function isValidUploadSessionId(value: unknown): value is string {
  return typeof value === "string" && UPLOAD_SESSION_ID_REGEX.test(value);
}

export function resolveUploadAuthorization(
  session: Session,
  input: UploadAuthorizeInput,
):
  | { ok: true; uploadType: UploadType; pathname: string; allowedContentTypes: readonly string[]; maximumSizeInBytes: number }
  | { ok: false; status: number; error: string } {
  const uploadType: UploadType = input.type === "logo" ? "logo" : "attachment";

  if (typeof input.fileName !== "string" || input.fileName.trim().length === 0) {
    return { ok: false, status: 400, error: "fileName is required" };
  }

  if (typeof input.contentType !== "string" || typeof input.contentLength !== "number") {
    return { ok: false, status: 400, error: "contentType and contentLength are required" };
  }

  const fileValidation = validateServerUpload(
    uploadType,
    input.contentType,
    input.contentLength,
  );
  if (!fileValidation.valid) {
    return { ok: false, status: 400, error: fileValidation.error ?? "Invalid file." };
  }

  const clientId = typeof input.clientId === "string" ? input.clientId : undefined;
  const requestId = typeof input.requestId === "string" ? input.requestId : undefined;
  const uploadSessionId =
    typeof input.uploadSessionId === "string" ? input.uploadSessionId : undefined;

  if (uploadType === "logo") {
    if (session.user.role !== "ADMIN") {
      return { ok: false, status: 403, error: "Only admins can upload logos" };
    }
    if (!clientId) {
      return { ok: false, status: 400, error: "Client ID is required for logo uploads" };
    }

    return {
      ok: true,
      uploadType,
      pathname: generateStoragePath("logo", clientId, input.fileName),
      allowedContentTypes: ALLOWED_LOGO_TYPES,
      maximumSizeInBytes: MAX_FILE_SIZE_LOGO,
    };
  }

  const isAdmin = session.user.role === "ADMIN";

  if (!isAdmin && !session.user.clientId) {
    return { ok: false, status: 403, error: "User must have a client ID or be an admin" };
  }

  const uploadClientId = isAdmin ? clientId : session.user.clientId;

  if (!uploadClientId) {
    return { ok: false, status: 400, error: "Client ID is required" };
  }

  if (!isAdmin && session.user.clientId !== uploadClientId) {
    return { ok: false, status: 403, error: "Cannot upload files for another client" };
  }

  if (!requestId && !isValidUploadSessionId(uploadSessionId)) {
    return {
      ok: false,
      status: 400,
      error: "A valid upload session ID is required for new request attachments",
    };
  }

  return {
    ok: true,
    uploadType,
    pathname: generateStoragePath("attachment", uploadClientId, input.fileName, {
      requestId: requestId || undefined,
      uploadSessionId: requestId ? undefined : uploadSessionId,
    }),
    allowedContentTypes: ALLOWED_ATTACHMENT_TYPES,
    maximumSizeInBytes: MAX_FILE_SIZE_ATTACHMENT,
  };
}

export function assertPathnameAllowedForSession(
  session: Session,
  pathname: string,
): { ok: true } | { ok: false; error: string } {
  const isAdmin = session.user.role === "ADMIN";
  const sessionClientId = session.user.clientId;

  if (pathname.startsWith("logos/")) {
    if (!isAdmin) {
      return { ok: false, error: "Forbidden." };
    }
    const pathClientId = pathname.match(/^logos\/([^/]+)\//)?.[1];
    if (!pathClientId) {
      return { ok: false, error: "Invalid pathname." };
    }
    return { ok: true };
  }

  if (!pathname.startsWith("attachments/")) {
    return { ok: false, error: "Invalid pathname." };
  }

  const pathClientId = pathname.match(/^attachments\/([^/]+)\//)?.[1];
  if (!pathClientId) {
    return { ok: false, error: "Invalid pathname." };
  }

  if (isAdmin) {
    return { ok: true };
  }

  if (sessionClientId && sessionClientId === pathClientId) {
    return { ok: true };
  }

  return { ok: false, error: "Forbidden." };
}
