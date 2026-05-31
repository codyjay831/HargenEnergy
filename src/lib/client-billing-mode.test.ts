import { describe, it, expect } from "vitest";
import { BillingMode } from "@/generated/prisma/client";
import { validateClientBillingModeUpdate } from "@/lib/client-billing-mode";

const futureDate = () => {
  const d = new Date();
  d.setDate(d.getDate() + 7);
  return d.toISOString().slice(0, 10);
};

describe("validateClientBillingModeUpdate", () => {
  it("accepts weekly hours/rate when returning to Stripe", () => {
    const result = validateClientBillingModeUpdate(
      {
        clientId: "c1",
        billingMode: BillingMode.STRIPE,
        weeklyHours: 5,
        hourlyRateCents: 9000,
      },
      { requiresSupportBlockPlan: true },
    );
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data.weeklyHours).toBe(5);
      expect(result.data.hourlyRateCents).toBe(9000);
    }
  });

  it("requires weeklyHours for non-Stripe Support Block saves", () => {
    const result = validateClientBillingModeUpdate(
      {
        clientId: "c1",
        billingMode: BillingMode.DEMO,
        reason: "Demo account",
        expiresAt: futureDate(),
        hourlyRateCents: 9000,
      },
      { requiresSupportBlockPlan: true },
    );
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error).toContain("Weekly reserved hours");
    }
  });

  it("accepts demo mode with pricing inputs for Support Block", () => {
    const result = validateClientBillingModeUpdate(
      {
        clientId: "c1",
        billingMode: BillingMode.DEMO,
        reason: "Demo account",
        expiresAt: futureDate(),
        weeklyHours: 5,
        hourlyRateCents: 8500,
      },
      { requiresSupportBlockPlan: true },
    );
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data.weeklyHours).toBe(5);
      expect(result.data.hourlyRateCents).toBe(8500);
    }
  });

  it("does not require pricing inputs when Support Block plan not required", () => {
    const result = validateClientBillingModeUpdate({
      clientId: "c1",
      billingMode: BillingMode.MANUAL,
      reason: "Manual billing",
    });
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data.weeklyHours).toBeUndefined();
      expect(result.data.hourlyRateCents).toBeUndefined();
    }
  });
});
