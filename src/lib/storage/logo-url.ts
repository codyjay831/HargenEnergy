import { isExternalHttpsUrl, isVercelBlobUrl } from "@/lib/storage/blob-ref";

export function resolveClientLogoUrl(logoUrl: string | null | undefined): string | null {
  if (!logoUrl) {
    return null;
  }

  if (isVercelBlobUrl(logoUrl) || isExternalHttpsUrl(logoUrl)) {
    return logoUrl;
  }

  return null;
}
