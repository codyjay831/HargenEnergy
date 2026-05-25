export const MAX_FILE_SIZE_ATTACHMENT = 8 * 1024 * 1024; // 8MB
export const MAX_FILE_SIZE_LOGO = 2 * 1024 * 1024; // 2MB
export const MAX_PORTAL_ATTACHMENTS = 10;

export const ALLOWED_ATTACHMENT_TYPES = [
  "application/pdf",
  "image/jpeg",
  "image/jpg",
  "image/png",
  "image/gif",
  "image/webp",
] as const;

export const ALLOWED_LOGO_TYPES = [
  "image/jpeg",
  "image/jpg",
  "image/png",
  "image/gif",
  "image/webp",
] as const;

export type AllowedAttachmentType = (typeof ALLOWED_ATTACHMENT_TYPES)[number];
