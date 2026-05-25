export type SniffedMime =
  | "application/pdf"
  | "image/jpeg"
  | "image/png"
  | "image/gif"
  | "image/webp"
  | null;

const JPEG_MAGIC = [0xff, 0xd8, 0xff];
const PNG_MAGIC = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];
const GIF87A_MAGIC = [0x47, 0x49, 0x46, 0x38, 0x37, 0x61];
const GIF89A_MAGIC = [0x47, 0x49, 0x46, 0x38, 0x39, 0x61];
const PDF_MAGIC = [0x25, 0x50, 0x44, 0x46, 0x2d]; // %PDF-

function hasMagic(bytes: Uint8Array, magic: number[], offset = 0): boolean {
  if (bytes.length < offset + magic.length) {
    return false;
  }
  for (let i = 0; i < magic.length; i++) {
    if (bytes[offset + i] !== magic[i]) {
      return false;
    }
  }
  return true;
}

export function sniffMimeTypeFromBytes(bytes: Uint8Array): SniffedMime {
  if (hasMagic(bytes, PDF_MAGIC)) {
    return "application/pdf";
  }
  if (hasMagic(bytes, JPEG_MAGIC)) {
    return "image/jpeg";
  }
  if (hasMagic(bytes, PNG_MAGIC)) {
    return "image/png";
  }
  if (hasMagic(bytes, GIF87A_MAGIC) || hasMagic(bytes, GIF89A_MAGIC)) {
    return "image/gif";
  }
  // WEBP container: RIFF....WEBP
  if (
    hasMagic(bytes, [0x52, 0x49, 0x46, 0x46]) &&
    hasMagic(bytes, [0x57, 0x45, 0x42, 0x50], 8)
  ) {
    return "image/webp";
  }
  return null;
}

export function normalizeMimeForSniff(value: string | null | undefined): string | null {
  if (!value) return null;
  if (value === "image/jpg") return "image/jpeg";
  return value;
}

export function isSniffedMimeAllowed(
  sniffed: SniffedMime,
  declared: string | null | undefined,
): boolean {
  const normalizedDeclared = normalizeMimeForSniff(declared);
  const normalizedSniffed = normalizeMimeForSniff(sniffed);
  if (!normalizedDeclared || !normalizedSniffed) {
    return false;
  }
  return normalizedDeclared === normalizedSniffed;
}
