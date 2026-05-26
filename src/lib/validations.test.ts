import { describe, expect, it } from "vitest";
import { requestHelpSchema } from "@/lib/validations";

const baseInput = {
  companyName: "Solar Pros LLC",
  name: "Jane Doe",
  email: "jane@solarpros.com",
  requestedWorkTaskIds: ["task-permit-follow-up"],
  bottleneck: "Permits are stuck",
  plan: "not-sure" as const,
  urgency: "this-week" as const,
};

describe("requestHelpSchema website normalization", () => {
  it("normalizes bare domains to https", () => {
    const parsed = requestHelpSchema.safeParse({
      ...baseInput,
      website: "www.vehiclix.app",
    });

    expect(parsed.success).toBe(true);
    if (parsed.success) {
      expect(parsed.data.website).toBe("https://www.vehiclix.app/");
    }
  });

  it("preserves explicit https URLs", () => {
    const parsed = requestHelpSchema.safeParse({
      ...baseInput,
      website: "https://solarpros.com",
    });

    expect(parsed.success).toBe(true);
    if (parsed.success) {
      expect(parsed.data.website).toBe("https://solarpros.com/");
    }
  });

  it("allows omitted website", () => {
    const parsed = requestHelpSchema.safeParse(baseInput);

    expect(parsed.success).toBe(true);
    if (parsed.success) {
      expect(parsed.data.website).toBeUndefined();
    }
  });

  it("rejects invalid website values", () => {
    const parsed = requestHelpSchema.safeParse({
      ...baseInput,
      website: "not a url",
    });

    expect(parsed.success).toBe(false);
    if (!parsed.success) {
      expect(parsed.error.flatten().fieldErrors.website?.[0]).toBe(
        "Enter a valid website address.",
      );
    }
  });

  it("rejects javascript URLs", () => {
    const parsed = requestHelpSchema.safeParse({
      ...baseInput,
      website: "javascript:alert(1)",
    });

    expect(parsed.success).toBe(false);
  });
});
