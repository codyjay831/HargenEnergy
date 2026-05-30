import { describe, expect, it } from "vitest";
import {
  BillableType,
  EngagementType,
  HandoffTier,
  PricingMode,
  RequestPaymentStatus,
} from "@/generated/prisma/client";
import {
  assertRequestBasedBillableWorkAllowed,
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

  it("blocks fixed-fee billable work when payment is pending", () => {
    const result = assertRequestBasedBillableWorkAllowed({
      engagementType: EngagementType.REQUEST_BASED,
      request: {
        handoffTier: HandoffTier.CLEAN,
        pricingMode: PricingMode.FLAT,
        flatPriceCents: 25000,
        paymentStatus: RequestPaymentStatus.PENDING,
      },
      billableType: BillableType.INCLUDED,
    });

    expect(result.ok).toBe(false);
  });

  it("allows fixed-fee billable work when payment is paid", () => {
    const result = assertRequestBasedBillableWorkAllowed({
      engagementType: EngagementType.REQUEST_BASED,
      request: {
        handoffTier: HandoffTier.CLEAN,
        pricingMode: PricingMode.FLAT,
        flatPriceCents: 25000,
        paymentStatus: RequestPaymentStatus.PAID,
      },
      billableType: BillableType.INCLUDED,
    });

    expect(result).toEqual({ ok: true });
  });
});
