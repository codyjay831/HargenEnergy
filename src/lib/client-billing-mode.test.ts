import { describe, it, expect } from "vitest";
import { BillingMode, PlanType } from "@/generated/prisma/client";
import { validateClientBillingModeUpdate } from "@/lib/client-billing-mode";

const futureDate = () => {
  const d = new Date();
  d.setDate(d.getDate() + 7);
  return d.toISOString().slice(0, 10);
};

describe("validateClientBillingModeUpdate", () => {
  it("ignores planType when returning to Stripe", () => {
    const result = validateClientBillingModeUpdate(
      {
        clientId: "c1",
        billingMode: BillingMode.STRIPE,
        planType: "LIGHT",
      },
      { requiresSupportBlockPlan: true },
    );
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data.planType).toBeUndefined();
    }
  });

  it("requires planType for non-Stripe Support Block saves", () => {
    const result = validateClientBillingModeUpdate(
      {
        clientId: "c1",
        billingMode: BillingMode.DEMO,
        reason: "Demo account",
        expiresAt: futureDate(),
      },
      { requiresSupportBlockPlan: true },
    );
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error).toContain("Support Block plan is required");
    }
  });

  it("accepts demo mode with planType when Support Block plan required", () => {
    const result = validateClientBillingModeUpdate(
      {
        clientId: "c1",
        billingMode: BillingMode.DEMO,
        reason: "Demo account",
        expiresAt: futureDate(),
        planType: "LIGHT",
      },
      { requiresSupportBlockPlan: true },
    );
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data.planType).toBe(PlanType.LIGHT);
    }
  });

  it("does not require planType when Support Block plan not required", () => {
    const result = validateClientBillingModeUpdate({
      clientId: "c1",
      billingMode: BillingMode.MANUAL,
      reason: "Manual billing",
    });
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data.planType).toBeUndefined();
    }
  });
});
