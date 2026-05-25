/**
 * Targeted checks for portal attachment blob URL validation.
 * Run: npx tsx scripts/test-attachment-url-validation.ts
 */

import {
  isAllowedAttachmentPathname,
  isAllowedLogoPathname,
  isBlobPathname,
} from "../src/lib/storage/paths";
import {
  isAllowedPortalAttachmentRef,
  isVercelBlobUrl,
  pathnameFromBlobRef,
} from "../src/lib/storage/blob-ref";
import { createPortalSubmitRequestSchema } from "../src/lib/validations";

const CLIENT_ID = "client_abc123";

const validBlobUrl =
  "https://abc123.public.blob.vercel-storage.com/attachments/client_abc123/pending/session/file.pdf";

const wrongClientBlobUrl =
  "https://abc123.public.blob.vercel-storage.com/attachments/other_client/pending/session/file.pdf";

const evilHostUrl = "https://evil.com/attachments/client_abc123/pending/session/file.pdf";

function assert(name: string, condition: boolean) {
  if (!condition) {
    console.error(`FAIL: ${name}`);
    process.exitCode = 1;
    return;
  }
  console.log(`PASS: ${name}`);
}

console.log("--- isBlobPathname ---");
assert(
  "recognizes attachment path",
  isBlobPathname("attachments/client_abc123/pending/session/file.pdf"),
);
assert("recognizes logo path", isBlobPathname("logos/client_abc123/logo.png"));
assert("rejects https URL", !isBlobPathname(validBlobUrl));

console.log("\n--- isAllowedAttachmentPathname ---");
assert(
  "accepts valid client path",
  isAllowedAttachmentPathname("attachments/client_abc123/pending/session/file.pdf", CLIENT_ID),
);
assert(
  "rejects wrong client path",
  !isAllowedAttachmentPathname("attachments/other_client/pending/session/file.pdf", CLIENT_ID),
);

console.log("\n--- isVercelBlobUrl ---");
assert("accepts vercel blob host", isVercelBlobUrl(validBlobUrl));
assert("rejects evil host", !isVercelBlobUrl(evilHostUrl));

console.log("\n--- pathnameFromBlobRef ---");
assert(
  "parses blob URL pathname",
  pathnameFromBlobRef(validBlobUrl) ===
    "attachments/client_abc123/pending/session/file.pdf",
);
assert(
  "accepts raw pathname",
  pathnameFromBlobRef("attachments/client_abc123/pending/session/file.pdf") ===
    "attachments/client_abc123/pending/session/file.pdf",
);

console.log("\n--- isAllowedPortalAttachmentRef ---");
assert(
  "accepts valid blob URL for client",
  isAllowedPortalAttachmentRef(validBlobUrl, CLIENT_ID),
);
assert(
  "rejects wrong client blob URL",
  !isAllowedPortalAttachmentRef(wrongClientBlobUrl, CLIENT_ID),
);

console.log("\n--- isAllowedLogoPathname ---");
assert(
  "accepts logo path for client",
  isAllowedLogoPathname("logos/client_abc123/logo.png", CLIENT_ID),
);

console.log("\n--- createPortalSubmitRequestSchema ---");
const base = {
  title: "Test",
  workTaskId: "task1",
  supportNeeded: "Support",
  description: "Desc",
  urgency: "NORMAL",
};

const schema = createPortalSubmitRequestSchema(CLIENT_ID);

assert(
  "accepts blob URL attachment",
  schema.safeParse({
    ...base,
    attachments: [
      {
        url: validBlobUrl,
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
        url: validBlobUrl,
        name: "file.html",
        type: "text/html",
      },
    ],
  }).success,
);

assert(
  "rejects wrong client blob URL",
  !schema.safeParse({
    ...base,
    attachments: [
      {
        url: wrongClientBlobUrl,
        name: "file.pdf",
        type: "application/pdf",
      },
    ],
  }).success,
);

if (process.exitCode) {
  console.error("\nSome attachment validation checks failed.");
  process.exit(process.exitCode);
}

console.log("\nAll attachment validation checks passed.");
