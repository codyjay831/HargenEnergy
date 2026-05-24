/**
 * Targeted checks for portal attachment URL validation.
 * Run: npx tsx scripts/test-attachment-url-validation.ts
 */

import {
  isAllowedFirebaseStorageUrl,
  isAllowedPortalAttachmentUrl,
  parseFirebaseStorageObjectPath,
} from "../src/lib/firebase/attachment-url-validation";
import { createPortalSubmitRequestSchema } from "../src/lib/validations";

const BUCKET = "test-bucket";
const CLIENT_ID = "client_abc123";

const validSdkUrl =
  "https://firebasestorage.googleapis.com/v0/b/test-bucket/o/attachments%2Fclient_abc123%2Fpending%2Fsession%2Ffile.pdf?alt=media&token=abc";

const wrongBucketUrl =
  "https://firebasestorage.googleapis.com/v0/b/other-bucket/o/attachments%2Fclient_abc123%2Fpending%2Fsession%2Ffile.pdf?alt=media&token=abc";

const evilHostUrl = "https://evil.com/attachments/client_abc123/pending/session/file.pdf";

const wrongClientPathUrl =
  "https://firebasestorage.googleapis.com/v0/b/test-bucket/o/attachments%2Fother_client%2Fpending%2Fsession%2Ffile.pdf?alt=media&token=abc";

function assert(name: string, condition: boolean) {
  if (!condition) {
    console.error(`FAIL: ${name}`);
    process.exitCode = 1;
    return;
  }
  console.log(`PASS: ${name}`);
}

console.log("--- parseFirebaseStorageObjectPath ---");
const parsed = parseFirebaseStorageObjectPath(validSdkUrl);
assert("parses SDK bucket", parsed.bucket === BUCKET);
assert(
  "parses SDK object path",
  parsed.objectPath === "attachments/client_abc123/pending/session/file.pdf",
);

console.log("\n--- isAllowedFirebaseStorageUrl ---");
assert(
  "accepts valid SDK URL for configured bucket",
  isAllowedFirebaseStorageUrl(validSdkUrl, BUCKET),
);
assert(
  "rejects wrong bucket",
  !isAllowedFirebaseStorageUrl(wrongBucketUrl, BUCKET),
);
assert(
  "rejects evil host",
  !isAllowedFirebaseStorageUrl(evilHostUrl, BUCKET),
);

console.log("\n--- isAllowedPortalAttachmentUrl ---");
assert(
  "accepts valid SDK URL for client path",
  isAllowedPortalAttachmentUrl(validSdkUrl, CLIENT_ID, BUCKET),
);
assert(
  "rejects wrong client path",
  !isAllowedPortalAttachmentUrl(wrongClientPathUrl, CLIENT_ID, BUCKET),
);

console.log("\n--- createPortalSubmitRequestSchema (MIME) ---");
const base = {
  title: "Test",
  workTaskId: "task1",
  supportNeeded: "Support",
  description: "Desc",
  urgency: "NORMAL",
};

const schema = createPortalSubmitRequestSchema(CLIENT_ID);

assert(
  "accepts valid attachment payload",
  schema.safeParse({
    ...base,
    attachments: [
      {
        url: validSdkUrl,
        name: "file.pdf",
        type: "application/pdf",
      },
    ],
  }).success,
);

assert(
  "rejects invalid MIME",
  !schema.safeParse({
    ...base,
    attachments: [
      {
        url: validSdkUrl,
        name: "file.html",
        type: "text/html",
      },
    ],
  }).success,
);

assert(
  "rejects evil host via schema",
  !schema.safeParse({
    ...base,
    attachments: [
      {
        url: evilHostUrl,
        name: "file.pdf",
        type: "application/pdf",
      },
    ],
  }).success,
);

if (process.exitCode) {
  console.error("\nSome attachment URL validation checks failed.");
  process.exit(process.exitCode);
}

console.log("\nAll attachment URL validation checks passed.");
