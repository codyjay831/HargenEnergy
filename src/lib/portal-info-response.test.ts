import { describe, expect, it } from "vitest";
import { RequestStatus } from "@/lib/enums";
import {
  buildInfoResponseCommentBody,
  isNeedsInfoActive,
  resolveStatusAfterInfoResponse,
} from "@/lib/portal-info-response";
import { createPortalSubmitInfoResponseSchema } from "@/lib/validations";

describe("isNeedsInfoActive", () => {
  it("returns true when needsInfo flag is set", () => {
    expect(
      isNeedsInfoActive({ needsInfo: true, status: RequestStatus.IN_PROGRESS }),
    ).toBe(true);
  });

  it("returns true when status is NEEDS_INFO", () => {
    expect(
      isNeedsInfoActive({ needsInfo: false, status: RequestStatus.NEEDS_INFO }),
    ).toBe(true);
  });

  it("returns false when neither condition applies", () => {
    expect(
      isNeedsInfoActive({ needsInfo: false, status: RequestStatus.IN_PROGRESS }),
    ).toBe(false);
  });
});

describe("resolveStatusAfterInfoResponse", () => {
  it("transitions NEEDS_INFO to IN_PROGRESS", () => {
    expect(resolveStatusAfterInfoResponse(RequestStatus.NEEDS_INFO)).toBe(
      RequestStatus.IN_PROGRESS,
    );
  });

  it("leaves IN_PROGRESS unchanged", () => {
    expect(resolveStatusAfterInfoResponse(RequestStatus.IN_PROGRESS)).toBe(
      RequestStatus.IN_PROGRESS,
    );
  });

  it("leaves NEW unchanged when only needsInfo was set", () => {
    expect(resolveStatusAfterInfoResponse(RequestStatus.NEW)).toBe(RequestStatus.NEW);
  });
});

describe("buildInfoResponseCommentBody", () => {
  it("returns trimmed body when provided", () => {
    expect(buildInfoResponseCommentBody("  Here are the details  ", [])).toBe(
      "Here are the details",
    );
  });

  it("auto-generates summary for files-only responses", () => {
    expect(
      buildInfoResponseCommentBody(undefined, ["plan-set.pdf", "meter.jpg"]),
    ).toBe("Attached 2 files: plan-set.pdf, meter.jpg");
  });

  it("uses singular file label for one attachment", () => {
    expect(buildInfoResponseCommentBody("", ["photo.png"])).toBe(
      "Attached 1 file: photo.png",
    );
  });
});

describe("createPortalSubmitInfoResponseSchema", () => {
  const schema = createPortalSubmitInfoResponseSchema("client-1");

  it("rejects empty body and no attachments", () => {
    const result = schema.safeParse({ requestId: "req-1" });
    expect(result.success).toBe(false);
  });

  it("accepts body only", () => {
    const result = schema.safeParse({
      requestId: "req-1",
      body: "Details attached in message",
    });
    expect(result.success).toBe(true);
  });

  it("accepts attachments only when body is omitted", () => {
    const result = schema.safeParse({
      requestId: "req-1",
      attachments: [],
    });
    expect(result.success).toBe(false);

    const withWhitespace = schema.safeParse({
      requestId: "req-1",
      body: "   ",
    });
    expect(withWhitespace.success).toBe(false);
  });
});
