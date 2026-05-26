import { describe, expect, it } from "vitest";
import { RequestStatus } from "@/lib/enums";
import { canTransitionQualificationStatus } from "@/lib/sales/lifecycle";

describe("canTransitionQualificationStatus", () => {
  it("allows NEW to NEEDS_INFO", () => {
    expect(canTransitionQualificationStatus(RequestStatus.NEW, RequestStatus.NEEDS_INFO)).toBe(
      true,
    );
  });

  it("allows REVIEWED to NEEDS_INFO", () => {
    expect(
      canTransitionQualificationStatus(RequestStatus.REVIEWED, RequestStatus.NEEDS_INFO),
    ).toBe(true);
  });

  it("allows NEEDS_INFO to REVIEWED", () => {
    expect(
      canTransitionQualificationStatus(RequestStatus.NEEDS_INFO, RequestStatus.REVIEWED),
    ).toBe(true);
  });

  it("allows NEW to REVIEWED and CANCELLED", () => {
    expect(canTransitionQualificationStatus(RequestStatus.NEW, RequestStatus.REVIEWED)).toBe(true);
    expect(canTransitionQualificationStatus(RequestStatus.NEW, RequestStatus.CANCELLED)).toBe(true);
  });

  it("blocks IN_PROGRESS to NEEDS_INFO", () => {
    expect(
      canTransitionQualificationStatus(RequestStatus.IN_PROGRESS, RequestStatus.NEEDS_INFO),
    ).toBe(false);
  });
});
