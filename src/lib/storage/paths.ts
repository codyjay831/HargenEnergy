export function isBlobPathname(value: string): boolean {
  return value.startsWith("attachments/") || value.startsWith("logos/");
}

export function parsePathnameTenantId(pathname: string): string | null {
  const match = pathname.match(/^(?:attachments|logos)\/([^/]+)\//);
  return match?.[1] ?? null;
}

export function isAllowedLogoPathname(pathname: string, clientId: string): boolean {
  return pathname.startsWith(`logos/${clientId}/`);
}

export function isAllowedAttachmentPathname(pathname: string, clientId: string): boolean {
  return pathname.startsWith(`attachments/${clientId}/`);
}

export function buildFileReadUrl(blobUrl: string): string {
  return `/api/files/read?url=${encodeURIComponent(blobUrl)}`;
}

export function generateStoragePath(
  type: "attachment" | "logo",
  clientId: string,
  fileName: string,
  options?: { requestId?: string; uploadSessionId?: string },
): string {
  const timestamp = Date.now();
  const sanitizedFileName = fileName.replace(/[^a-zA-Z0-9.-]/g, "_");
  const requestId = options?.requestId;
  const uploadSessionId = options?.uploadSessionId;

  if (type === "attachment") {
    if (requestId) {
      return `attachments/${clientId}/${requestId}/${timestamp}_${sanitizedFileName}`;
    }
    if (uploadSessionId) {
      return `attachments/${clientId}/pending/${uploadSessionId}/${timestamp}_${sanitizedFileName}`;
    }
  } else if (type === "logo") {
    return `logos/${clientId}/${timestamp}_${sanitizedFileName}`;
  }

  throw new Error("Invalid storage path parameters");
}
