import { strict as assert } from "node:assert";
import {
  isSniffedMimeAllowed,
  sniffMimeTypeFromBytes,
} from "../src/lib/storage/content-sniff";

function bytes(...values: number[]): Uint8Array {
  return Uint8Array.from(values);
}

const jpeg = bytes(0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10);
const png = bytes(0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a);
const gif = bytes(0x47, 0x49, 0x46, 0x38, 0x39, 0x61);
const pdf = bytes(0x25, 0x50, 0x44, 0x46, 0x2d, 0x31, 0x2e, 0x34);
const webp = bytes(
  0x52, 0x49, 0x46, 0x46, 0x24, 0x00, 0x00, 0x00,
  0x57, 0x45, 0x42, 0x50, 0x56, 0x50, 0x38, 0x20,
);
const unknown = bytes(0x00, 0x11, 0x22, 0x33);

assert.equal(sniffMimeTypeFromBytes(jpeg), "image/jpeg");
assert.equal(sniffMimeTypeFromBytes(png), "image/png");
assert.equal(sniffMimeTypeFromBytes(gif), "image/gif");
assert.equal(sniffMimeTypeFromBytes(pdf), "application/pdf");
assert.equal(sniffMimeTypeFromBytes(webp), "image/webp");
assert.equal(sniffMimeTypeFromBytes(unknown), null);

assert.equal(isSniffedMimeAllowed("image/jpeg", "image/jpg"), true);
assert.equal(isSniffedMimeAllowed("image/png", "image/png"), true);
assert.equal(isSniffedMimeAllowed("application/pdf", "image/png"), false);
assert.equal(isSniffedMimeAllowed(null, "image/png"), false);

console.log("All content sniff checks passed.");
