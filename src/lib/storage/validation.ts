import {
  MAX_FILE_SIZE_ATTACHMENT,
  MAX_FILE_SIZE_LOGO,
  ALLOWED_ATTACHMENT_TYPES,
  ALLOWED_LOGO_TYPES,
} from "@/lib/storage/limits";

export {
  MAX_FILE_SIZE_ATTACHMENT,
  MAX_FILE_SIZE_LOGO,
  MAX_PORTAL_ATTACHMENTS,
  ALLOWED_ATTACHMENT_TYPES,
  ALLOWED_LOGO_TYPES,
} from "@/lib/storage/limits";

export function validateFile(
  file: File,
  type: "attachment" | "logo",
): { valid: boolean; error?: string } {
  const maxSize = type === "attachment" ? MAX_FILE_SIZE_ATTACHMENT : MAX_FILE_SIZE_LOGO;
  const allowedTypes = type === "attachment" ? ALLOWED_ATTACHMENT_TYPES : ALLOWED_LOGO_TYPES;

  if (file.size > maxSize) {
    return {
      valid: false,
      error: `File size must be less than ${maxSize / 1024 / 1024}MB`,
    };
  }

  if (!(allowedTypes as readonly string[]).includes(file.type)) {
    return {
      valid: false,
      error: `File type ${file.type} is not allowed`,
    };
  }

  return { valid: true };
}

export function validateServerUpload(
  type: "attachment" | "logo",
  contentType: string,
  contentLength: number,
): { valid: boolean; error?: string } {
  const maxSize = type === "attachment" ? MAX_FILE_SIZE_ATTACHMENT : MAX_FILE_SIZE_LOGO;
  const allowedTypes = type === "attachment" ? ALLOWED_ATTACHMENT_TYPES : ALLOWED_LOGO_TYPES;

  if (!Number.isFinite(contentLength) || contentLength <= 0) {
    return { valid: false, error: "Invalid file size." };
  }

  if (contentLength > maxSize) {
    return {
      valid: false,
      error: `File size must be less than ${maxSize / 1024 / 1024}MB`,
    };
  }

  if (!(allowedTypes as readonly string[]).includes(contentType)) {
    return {
      valid: false,
      error: `File type ${contentType} is not allowed`,
    };
  }

  return { valid: true };
}
