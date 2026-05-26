import { describe, expect, it } from "vitest";
import {
  BillingMode,
  ClientStatus,
  EngagementType,
} from "@/generated/prisma/client";
import {
  canRequestScopeChange,
  getPortalWorkSubmitEligibility,
} from "@/lib/portal-submit-eligibility";

const activeSupportBlockBase = {
  status: ClientStatus.ACTIVE,
  engagementType: EngagementType.SUPPORT_BLOCK,
  billingMode: BillingMode.STRIPE,
  billingOverrideReason: null,
  billingOverrideExpiresAt: null,
  billingOverrideCreatedAt: null,
  billingOverrideCreatedById: null,
  stripeCustomerId: "cus_123",
  stripeSubscriptionId: "sub_123",
  subscriptionStatus: "active",
  subscriptionCurrentPeriodEnd: new Date("2026-06-01"),
  approvedWorkTaskCount: 2,
  activeCatalogTaskCount: 5,
};

const activeRequestBasedBase = {
  ...activeSupportBlockBase,
  engagementType: EngagementType.REQUEST_BASED,
  approvedWorkTaskCount: 0,
  subscriptionStatus: null,
  stripeSubscriptionId: null,
};

describe("getPortalWorkSubmitEligibility", () => {
  it("blocks Support Block submit when not active", () => {
    const result = getPortalWorkSubmitEligibility({
      ...activeSupportBlockBase,
      status: ClientStatus.LEAD,
    });
    expect(result).toEqual({
      canSubmit: false,
      reasonCode: "not_active",
      message: "Your account is being activated by Hargen.",
    });
  });

  it("blocks Support Block submit without approved scope", () => {
    const result = getPortalWorkSubmitEligibility({
      ...activeSupportBlockBase,
      approvedWorkTaskCount: 0,
    });
    expect(result).toEqual({
      canSubmit: false,
      reasonCode: "scope_not_configured",
      message: "Your approved support areas are being configured.",
    });
  });

  it("blocks Support Block submit until payment is made", () => {
    const result = getPortalWorkSubmitEligibility({
      ...activeSupportBlockBase,
      subscriptionStatus: "incomplete",
    });
    expect(result).toEqual({
      canSubmit: false,
      reasonCode: "payment_not_made",
      message: "Complete payment setup to send your first request.",
    });
  });

  it("allows Support Block submit with active subscription and scope", () => {
    expect(getPortalWorkSubmitEligibility(activeSupportBlockBase)).toEqual({
      canSubmit: true,
    });
  });

  it("allows Support Block submit with trialing subscription", () => {
    expect(
      getPortalWorkSubmitEligibility({
        ...activeSupportBlockBase,
        subscriptionStatus: "trialing",
      }),
    ).toEqual({ canSubmit: true });
  });

  it("allows Support Block submit with healthy manual billing override", () => {
    expect(
      getPortalWorkSubmitEligibility({
        ...activeSupportBlockBase,
        billingMode: BillingMode.MANUAL,
        subscriptionStatus: null,
        stripeSubscriptionId: null,
      }),
    ).toEqual({ canSubmit: true });
  });

  it("allows Request-Based submit without subscription payment when catalog exists", () => {
    expect(getPortalWorkSubmitEligibility(activeRequestBasedBase)).toEqual({
      canSubmit: true,
    });
  });

  it("blocks Request-Based submit when no active catalog tasks", () => {
    const result = getPortalWorkSubmitEligibility({
      ...activeRequestBasedBase,
      activeCatalogTaskCount: 0,
    });
    expect(result).toEqual({
      canSubmit: false,
      reasonCode: "no_catalog_tasks",
      message: "No work types are available right now.",
    });
  });

  it("never returns payment_not_made for Request-Based clients", () => {
    const result = getPortalWorkSubmitEligibility({
      ...activeRequestBasedBase,
      activeCatalogTaskCount: 0,
      subscriptionStatus: null,
    });
    expect(result).not.toEqual(
      expect.objectContaining({ reasonCode: "payment_not_made" }),
    );
  });
});

describe("canRequestScopeChange", () => {
  it("allows scope change requests for active clients only", () => {
    expect(canRequestScopeChange({ status: ClientStatus.ACTIVE })).toBe(true);
    expect(canRequestScopeChange({ status: ClientStatus.LEAD })).toBe(false);
  });
});
