import {
  isAllowedAttachmentPathname,
  isAllowedLogoPathname,
  isBlobPathname,
  parsePathnameTenantId,
} from "@/lib/storage/paths";
import { pathnameFromBlobRef } from "@/lib/storage/blob-ref";

export type StorageSessionUser = {
  role: string;
  clientId?: string | null;
};

export function assertCanReadPathname(
  user: StorageSessionUser,
  pathname: string,
): { ok: true } | { ok: false; error: string } {
  if (!isBlobPathname(pathname)) {
    return { ok: false, error: "Invalid storage path." };
  }

  const pathClientId = parsePathnameTenantId(pathname);
  if (!pathClientId) {
    return { ok: false, error: "Invalid storage path." };
  }

  if (user.role === "ADMIN") {
    return { ok: true };
  }

  if (user.clientId && user.clientId === pathClientId) {
    if (pathname.startsWith("attachments/")) {
      return isAllowedAttachmentPathname(pathname, user.clientId)
        ? { ok: true }
        : { ok: false, error: "Forbidden." };
    }
    if (pathname.startsWith("logos/")) {
      return isAllowedLogoPathname(pathname, user.clientId)
        ? { ok: true }
        : { ok: false, error: "Forbidden." };
    }
  }

  return { ok: false, error: "Forbidden." };
}

export function assertCanReadBlobRef(
  user: StorageSessionUser,
  ref: string,
): { ok: true } | { ok: false; error: string } {
  const pathname = pathnameFromBlobRef(ref);
  if (!pathname) {
    return { ok: false, error: "Invalid blob reference." };
  }
  return assertCanReadPathname(user, pathname);
}
