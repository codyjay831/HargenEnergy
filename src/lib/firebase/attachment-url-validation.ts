/**
 * Validates Firebase Storage download URLs for portal attachments.
 * Supports SDK format (firebasestorage.googleapis.com) and direct bucket hosts.
 */

export type ParsedFirebaseStorageUrl = {
  bucket: string | null;
  objectPath: string | null;
};

const GOOGLEAPIS_HOST = "firebasestorage.googleapis.com";

export function getConfiguredFirebaseStorageBucket(): string | undefined {
  const bucket = process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET?.trim();
  return bucket || undefined;
}

export function parseFirebaseStorageObjectPath(url: string): ParsedFirebaseStorageUrl {
  try {
    const parsed = new URL(url);
    if (parsed.protocol !== "https:") {
      return { bucket: null, objectPath: null };
    }

    if (parsed.hostname === GOOGLEAPIS_HOST) {
      const match = parsed.pathname.match(/^\/v0\/b\/([^/]+)\/o\/(.+)$/);
      if (!match) {
        return { bucket: null, objectPath: null };
      }
      const [, bucket, encodedPath] = match;
      return {
        bucket: decodeURIComponent(bucket),
        objectPath: decodeURIComponent(encodedPath.replace(/\+/g, " ")),
      };
    }

    const hostMatch = parsed.hostname.match(/^(.+)\.(firebasestorage\.app|appspot\.com)$/);
    if (hostMatch) {
      const bucket = hostMatch[1];
      const v0Match = parsed.pathname.match(/^\/v0\/b\/([^/]+)\/o\/(.+)$/);
      if (v0Match) {
        return {
          bucket: decodeURIComponent(v0Match[1]),
          objectPath: decodeURIComponent(v0Match[2].replace(/\+/g, " ")),
        };
      }
      const objectMatch = parsed.pathname.match(/^\/o\/(.+)$/);
      if (objectMatch) {
        return {
          bucket,
          objectPath: decodeURIComponent(objectMatch[1].replace(/\+/g, " ")),
        };
      }
      const objectPath = decodeURIComponent(parsed.pathname.replace(/^\//, ""));
      return { bucket, objectPath: objectPath || null };
    }

    return { bucket: null, objectPath: null };
  } catch {
    return { bucket: null, objectPath: null };
  }
}

export function isAllowedFirebaseStorageUrl(
  url: string,
  configuredBucket = getConfiguredFirebaseStorageBucket(),
): boolean {
  if (!configuredBucket) {
    return true;
  }

  const { bucket } = parseFirebaseStorageObjectPath(url);
  return bucket === configuredBucket;
}

export function isAllowedPortalAttachmentObjectPath(
  objectPath: string,
  clientId: string,
): boolean {
  const prefix = `attachments/${clientId}/`;
  return objectPath.startsWith(prefix);
}

export function isAllowedPortalAttachmentUrl(
  url: string,
  clientId: string,
  configuredBucket = getConfiguredFirebaseStorageBucket(),
): boolean {
  if (!isAllowedFirebaseStorageUrl(url, configuredBucket)) {
    return false;
  }

  if (!configuredBucket) {
    return true;
  }

  const { objectPath } = parseFirebaseStorageObjectPath(url);
  if (!objectPath) {
    return false;
  }

  return isAllowedPortalAttachmentObjectPath(objectPath, clientId);
}
