import { describe, expect, it } from "vitest";
import {
  AgreementStatus,
  BillingMode,
  ClientStatus,
  EngagementType,
} from "@/generated/prisma/client";
import {
  collectSubmitBlockers,
  deriveSubmitBlockerSummary,
  getSubmitBlockerCopy,
} from "@/lib/submit-blockers";

const activeSupportBlockBase = {
  status: ClientStatus.ACTIVE,
  agreementStatus: AgreementStatus.SIGNED,
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

describe("deriveSubmitBlockerSummary", () => {
  it("returns no blockers when all gates pass", () => {
    const summary = deriveSubmitBlockerSummary(activeSupportBlockBase);
    expect(summary.canSubmit).toBe(true);
    expect(summary.all).toHaveLength(0);
    expect(summary.primary).toBeUndefined();
  });

  it("ranks agreement_pending before scope and billing", () => {
    const summary = deriveSubmitBlockerSummary({
      ...activeSupportBlockBase,
      agreementStatus: AgreementStatus.SENT,
      approvedWorkTaskCount: 0,
      subscriptionStatus: "incomplete",
    });

    expect(summary.canSubmit).toBe(false);
    expect(summary.primary?.reasonCode).toBe("agreement_pending");
    expect(summary.all.map((b) => b.reasonCode)).toEqual(["agreement_pending"]);
    expect(summary.blockersByDomain.agreement).toBe(true);
    expect(summary.blockersByDomain.scope).toBe(false);
    expect(summary.blockersByDomain.billing).toBe(false);
  });

  it("prioritizes lifecycle blocker for LEAD clients", () => {
    const summary = deriveSubmitBlockerSummary({
      ...activeSupportBlockBase,
      status: ClientStatus.LEAD,
      agreementStatus: AgreementStatus.NOT_SENT,
      approvedWorkTaskCount: 0,
      subscriptionStatus: null,
    });

    expect(summary.primary?.reasonCode).toBe("not_active");
    expect(summary.blockersByDomain.lifecycle).toBe(true);
  });

  it("uses shared copy for admin and portal audiences", () => {
    expect(getSubmitBlockerCopy("agreement_pending", "portal")).toContain("agreement");
    expect(getSubmitBlockerCopy("agreement_pending", "admin")).toContain("signed");
  });

  it("allows submit in hybrid when request-based path is ready", () => {
    const summary = deriveSubmitBlockerSummary({
      ...activeSupportBlockBase,
      activeServiceModels: [
        "SUPPORT_BLOCK",
        "REQUEST_BASED",
      ],
      approvedWorkTaskCount: 0,
      subscriptionStatus: "incomplete",
      activeCatalogTaskCount: 5,
    });

    expect(summary.canSubmit).toBe(true);
    expect(summary.all).toHaveLength(0);
  });
});

describe("collectSubmitBlockers", () => {
  it("does not include billing blockers for request-based clients", () => {
    const blockers = collectSubmitBlockers({
      ...activeSupportBlockBase,
      engagementType: EngagementType.REQUEST_BASED,
      activeCatalogTaskCount: 0,
      approvedWorkTaskCount: 0,
      subscriptionStatus: null,
      stripeSubscriptionId: null,
    });

    expect(blockers.map((b) => b.reasonCode)).toEqual(["no_catalog_tasks"]);
  });
});
