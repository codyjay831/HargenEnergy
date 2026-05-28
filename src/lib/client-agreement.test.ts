import { describe, expect, it } from "vitest";
import { AgreementStatus } from "@/generated/prisma/client";
import {
  buildAgreementUpdateData,
  canTransitionAgreementStatus,
  getClientAgreementReadiness,
  isAgreementSatisfied,
  validateAgreementTransition,
} from "@/lib/client-agreement";

describe("client agreement", () => {
  it("treats signed and waived as satisfied", () => {
    expect(isAgreementSatisfied(AgreementStatus.SIGNED)).toBe(true);
    expect(isAgreementSatisfied(AgreementStatus.WAIVED)).toBe(true);
    expect(isAgreementSatisfied(AgreementStatus.SENT)).toBe(false);
  });

  it("returns agreement_pending readiness when not satisfied", () => {
    const result = getClientAgreementReadiness({
      agreementStatus: AgreementStatus.SENT,
      agreementSentAt: new Date("2026-05-01"),
      agreementSignedAt: null,
      agreementUrl: null,
    });
    expect(result.ready).toBe(false);
    expect(result.reasonCode).toBe("agreement_pending");
    expect(result.nextAction).toBe("mark_signed");
    expect(result.statusLabel).toBe("Sent — awaiting signature");
    expect(result.effectiveAt).toEqual(new Date("2026-05-01"));
  });

  it("enforces transition rules and waiver note requirements", () => {
    expect(
      validateAgreementTransition({
        from: AgreementStatus.NOT_SENT,
        to: AgreementStatus.WAIVED,
      }).ok,
    ).toBe(false);

    expect(
      validateAgreementTransition({
        from: AgreementStatus.NOT_SENT,
        to: AgreementStatus.WAIVED,
        overrideReason: "Legacy client",
      }).ok,
    ).toBe(true);

    expect(
      validateAgreementTransition({
        from: AgreementStatus.SIGNED,
        to: AgreementStatus.NOT_SENT,
      }).ok,
    ).toBe(false);

    expect(
      validateAgreementTransition({
        from: AgreementStatus.SIGNED,
        to: AgreementStatus.NOT_SENT,
        note: "Client requested re-sign",
      }).ok,
    ).toBe(true);
  });

  it("sets timestamps when marking sent or signed", () => {
    const now = new Date("2026-05-28T12:00:00Z");
    expect(
      buildAgreementUpdateData({
        from: AgreementStatus.NOT_SENT,
        to: AgreementStatus.SENT,
        now,
      }),
    ).toMatchObject({
      agreementStatus: AgreementStatus.SENT,
      agreementSentAt: now,
      agreementSignedAt: null,
    });

    expect(
      buildAgreementUpdateData({
        from: AgreementStatus.SENT,
        to: AgreementStatus.SIGNED,
        now,
      }),
    ).toMatchObject({
      agreementStatus: AgreementStatus.SIGNED,
      agreementSignedAt: now,
    });
  });

  it("allows expected forward transitions", () => {
    expect(canTransitionAgreementStatus(AgreementStatus.NOT_SENT, AgreementStatus.SENT)).toBe(
      true,
    );
    expect(canTransitionAgreementStatus(AgreementStatus.SENT, AgreementStatus.SIGNED)).toBe(
      true,
    );
    expect(
      canTransitionAgreementStatus(AgreementStatus.NOT_SENT, AgreementStatus.SIGNED),
    ).toBe(false);
  });
});
