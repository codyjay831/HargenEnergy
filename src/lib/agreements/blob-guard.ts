import "server-only";

import { isBlobStorageConfigured } from "@/lib/storage/config";

export class AgreementBlobNotConfiguredError extends Error {
  constructor() {
    super(
      "Private file storage is not configured (BLOB_READ_WRITE_TOKEN missing). Agreement PDFs cannot be generated or stored until a private Vercel Blob store is linked.",
    );
    this.name = "AgreementBlobNotConfiguredError";
  }
}

export function assertPrivateBlobReady(): void {
  if (!isBlobStorageConfigured()) {
    throw new AgreementBlobNotConfiguredError();
  }
}

export function getPrivateBlobErrorMessage(error: unknown): string {
  if (error instanceof AgreementBlobNotConfiguredError) {
    return error.message;
  }
  return "Failed to store agreement PDF in private storage.";
}
