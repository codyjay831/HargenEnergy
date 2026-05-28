import { describe, expect, it } from "vitest";
import { HandoffTier, PricingMode } from "@/generated/prisma/client";
import {
  getRequestPricingState,
  getRequestPricingStateLabel,
  isRequestBasedPricingComplete,
} from "@/lib/engagement";

describe("request pricing state", () => {
  it("returns pending_review without handoff/pricing", () => {
    const request = { handoffTier: null, pricingMode: null, flatPriceCents: null };
    expect(getRequestPricingState(request)).toBe("pending_review");
    expect(isRequestBasedPricingComplete(request)).toBe(false);
  });

  it("returns fixed_fee_ready for valid flat fee", () => {
    const request = {
      handoffTier: HandoffTier.CLEAN,
      pricingMode: PricingMode.FLAT,
      flatPriceCents: 25000,
    };
    expect(getRequestPricingState(request)).toBe("fixed_fee_ready");
    expect(isRequestBasedPricingComplete(request)).toBe(true);
  });

  it("returns invalid for flat fee without price", () => {
    const request = {
      handoffTier: HandoffTier.MESSY,
      pricingMode: PricingMode.FLAT,
      flatPriceCents: null,
    };
    expect(getRequestPricingState(request)).toBe("invalid");
    expect(isRequestBasedPricingComplete(request)).toBe(false);
  });

  it("returns hourly_ready for hourly modes", () => {
    const request = {
      handoffTier: HandoffTier.RECOVERY,
      pricingMode: PricingMode.HOURLY,
      flatPriceCents: null,
    };
    expect(getRequestPricingState(request)).toBe("hourly_ready");
    expect(isRequestBasedPricingComplete(request)).toBe(true);
  });

  it("maps state to stable labels", () => {
    expect(getRequestPricingStateLabel("pending_review").toLowerCase()).toContain("pending");
    expect(getRequestPricingStateLabel("fixed_fee_ready").toLowerCase()).toContain("fixed");
  });
});
