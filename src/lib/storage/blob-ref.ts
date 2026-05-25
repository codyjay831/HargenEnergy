import {
  isAllowedAttachmentPathname,
  isAllowedLogoPathname,
  isBlobPathname,
  parsePathnameTenantId,
} from "@/lib/storage/paths";

const VERCEL_BLOB_HOST_SUFFIXES = [
  ".public.blob.vercel-storage.com",
  ".blob.vercel-storage.com",
  ".private.blob.vercel-storage.com",
];

export function isVercelBlobUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    if (parsed.protocol !== "https:") {
      return false;
    }
    return VERCEL_BLOB_HOST_SUFFIXES.some((suffix) => parsed.hostname.endsWith(suffix));
  } catch {
    return false;
  }
}

export function pathnameFromBlobRef(ref: string): string | null {
  if (isBlobPathname(ref)) {
    return ref;
  }

  if (!isVercelBlobUrl(ref)) {
    return null;
  }

  try {
    const parsed = new URL(ref);
    const pathname = parsed.pathname.replace(/^\//, "");
    return pathname.length > 0 ? pathname : null;
  } catch {
    return null;
  }
}

export function isAllowedPortalAttachmentRef(ref: string, clientId: string): boolean {
  const pathname = pathnameFromBlobRef(ref);
  if (!pathname) {
    return false;
  }
  return isAllowedAttachmentPathname(pathname, clientId);
}

export function isAllowedLogoRef(ref: string, clientId: string): boolean {
  const pathname = pathnameFromBlobRef(ref);
  if (!pathname) {
    return false;
  }
  return isAllowedLogoPathname(pathname, clientId);
}

export function isExternalHttpsUrl(value: string): boolean {
  try {
    const parsed = new URL(value);
    return parsed.protocol === "http:" || parsed.protocol === "https:";
  } catch {
    return false;
  }
}

export { parsePathnameTenantId };
