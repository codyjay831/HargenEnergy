import { describe, expect, it } from "vitest";
import { AgreementStatus, EngagementType } from "@/generated/prisma/client";
import { getClientActivationReadiness } from "@/lib/client-activation-readiness";

describe("client activation readiness", () => {
  it("blocks when agreement is not complete", () => {
    const result = getClientActivationReadiness({
      agreementStatus: AgreementStatus.NOT_SENT,
      engagementType: EngagementType.REQUEST_BASED,
      approvedWorkTaskCount: 0,
    });

    expect(result.canActivate).toBe(false);
    expect(result.blockers.map((b) => b.code)).toContain("agreement_not_complete");
  });

  it("blocks signed agreements without a usable URL", () => {
    const result = getClientActivationReadiness({
      agreementStatus: AgreementStatus.SIGNED,
      agreementUrl: "",
      engagementType: EngagementType.REQUEST_BASED,
      approvedWorkTaskCount: 0,
    });

    expect(result.canActivate).toBe(false);
    expect(result.blockers.map((b) => b.code)).toContain("signed_agreement_url_missing");
  });

  it("allows signed agreements when URL exists", () => {
    const result = getClientActivationReadiness({
      agreementStatus: AgreementStatus.SIGNED,
      agreementUrl: "https://example.com/signed.pdf",
      engagementType: EngagementType.REQUEST_BASED,
      approvedWorkTaskCount: 0,
    });

    expect(result.canActivate).toBe(true);
    expect(result.blockers).toHaveLength(0);
  });

  it("allows waived agreement with reason", () => {
    const result = getClientActivationReadiness({
      agreementStatus: AgreementStatus.WAIVED,
      agreementOverrideReason: "Legacy emergency handoff",
      engagementType: EngagementType.REQUEST_BASED,
      approvedWorkTaskCount: 0,
    });

    expect(result.canActivate).toBe(true);
  });

  it("blocks waived agreement without reason", () => {
    const result = getClientActivationReadiness({
      agreementStatus: AgreementStatus.WAIVED,
      agreementOverrideReason: "   ",
      engagementType: EngagementType.REQUEST_BASED,
      approvedWorkTaskCount: 0,
    });

    expect(result.canActivate).toBe(false);
    expect(result.blockers.map((b) => b.code)).toContain("waiver_reason_missing");
  });

  it("blocks support block clients with no approved scope", () => {
    const result = getClientActivationReadiness({
      agreementStatus: AgreementStatus.SIGNED,
      agreementUrl: "https://example.com/signed.pdf",
      engagementType: EngagementType.SUPPORT_BLOCK,
      approvedWorkTaskCount: 0,
    });

    expect(result.canActivate).toBe(false);
    expect(result.blockers.map((b) => b.code)).toContain("support_block_scope_missing");
  });

  it("blocks when service model is indeterminate", () => {
    const result = getClientActivationReadiness({
      agreementStatus: AgreementStatus.SIGNED,
      agreementUrl: "https://example.com/signed.pdf",
      engagementType: null,
      activeServiceModels: [],
      approvedWorkTaskCount: 0,
    });

    expect(result.canActivate).toBe(false);
    expect(result.blockers.map((b) => b.code)).toContain("service_model_missing");
  });
});
