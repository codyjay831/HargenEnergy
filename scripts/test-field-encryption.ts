import { strict as assert } from "node:assert";
import {
  createCipheriv,
  createDecipheriv,
  createHash,
  randomBytes,
} from "node:crypto";

const PREFIX = "enc:v1:";
const ALGO = "aes-256-gcm";
const IV_LEN = 12;
const TAG_LEN = 16;

function getKey(raw: string): Buffer {
  const asUtf8 = Buffer.from(raw, "utf8");
  if (asUtf8.length === 32) return asUtf8;
  return createHash("sha256").update(raw).digest();
}

function encryptFieldValue(value: string, rawKey: string): string {
  const iv = randomBytes(IV_LEN);
  const cipher = createCipheriv(ALGO, getKey(rawKey), iv);
  const ciphertext = Buffer.concat([cipher.update(value, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return `${PREFIX}${Buffer.concat([iv, tag, ciphertext]).toString("base64")}`;
}

function decryptFieldValue(value: string, rawKey: string): string {
  if (!value.startsWith(PREFIX)) return value;
  const payload = Buffer.from(value.slice(PREFIX.length), "base64");
  const iv = payload.subarray(0, IV_LEN);
  const tag = payload.subarray(IV_LEN, IV_LEN + TAG_LEN);
  const ciphertext = payload.subarray(IV_LEN + TAG_LEN);
  const decipher = createDecipheriv(ALGO, getKey(rawKey), iv);
  decipher.setAuthTag(tag);
  return Buffer.concat([decipher.update(ciphertext), decipher.final()]).toString("utf8");
}

const original = "https://vault.example.com/secure-share";
const key = "test-test-test-test-test-test-test-test";
const encrypted = encryptFieldValue(original, key);
assert.ok(encrypted);
assert.equal(encrypted.startsWith(PREFIX), true);
assert.equal(decryptFieldValue(encrypted, key), original);
assert.equal(decryptFieldValue("plain-text", key), "plain-text");

console.log("All field encryption checks passed.");
