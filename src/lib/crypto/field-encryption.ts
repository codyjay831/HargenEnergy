import "server-only";
import {
  createCipheriv,
  createDecipheriv,
  createHash,
  randomBytes,
} from "node:crypto";

const ENCRYPTION_PREFIX = "enc:v1:";
const ALGO = "aes-256-gcm";
const IV_LEN = 12;
const TAG_LEN = 16;

function getKey(): Buffer {
  const raw = process.env.FIELD_ENCRYPTION_KEY?.trim();
  if (!raw) {
    throw new Error("FIELD_ENCRYPTION_KEY is not set.");
  }
  const asUtf8 = Buffer.from(raw, "utf8");
  if (asUtf8.length === 32) {
    return asUtf8;
  }
  return createHash("sha256").update(raw).digest();
}

export function isEncryptedFieldValue(value: string | null | undefined): boolean {
  return typeof value === "string" && value.startsWith(ENCRYPTION_PREFIX);
}

export function encryptFieldValue(value: string | null | undefined): string | null {
  if (!value) return null;
  if (isEncryptedFieldValue(value)) return value;
  const iv = randomBytes(IV_LEN);
  const key = getKey();
  const cipher = createCipheriv(ALGO, key, iv);
  const ciphertext = Buffer.concat([cipher.update(value, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  const payload = Buffer.concat([iv, tag, ciphertext]).toString("base64");
  return `${ENCRYPTION_PREFIX}${payload}`;
}

export function decryptFieldValue(value: string | null | undefined): string | null {
  if (!value) return null;
  if (!isEncryptedFieldValue(value)) return value;
  const encoded = value.slice(ENCRYPTION_PREFIX.length);
  const payload = Buffer.from(encoded, "base64");
  if (payload.length < IV_LEN + TAG_LEN) {
    throw new Error("Encrypted field payload is invalid.");
  }
  const iv = payload.subarray(0, IV_LEN);
  const tag = payload.subarray(IV_LEN, IV_LEN + TAG_LEN);
  const ciphertext = payload.subarray(IV_LEN + TAG_LEN);
  const key = getKey();
  const decipher = createDecipheriv(ALGO, key, iv);
  decipher.setAuthTag(tag);
  const plaintext = Buffer.concat([
    decipher.update(ciphertext),
    decipher.final(),
  ]).toString("utf8");
  return plaintext;
}
