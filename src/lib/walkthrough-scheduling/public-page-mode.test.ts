import { describe, expect, it } from "vitest";
import {
  deriveWalkthroughPublicPageMode,
  isWalkthroughAppointmentCancelable,
  isWalkthroughAppointmentManageable,
} from "@/lib/walkthrough-scheduling/public-page-mode";
import { WalkthroughAppointmentStatus } from "@/generated/prisma/client";

describe("deriveWalkthroughPublicPageMode", () => {
  it("returns book when there is no appointment", () => {
    expect(deriveWalkthroughPublicPageMode({ appointment: null })).toBe("book");
  });

  it("returns manage for SCHEDULED and RESCHEDULED", () => {
    expect(
      deriveWalkthroughPublicPageMode({
        appointment: { status: WalkthroughAppointmentStatus.SCHEDULED },
      }),
    ).toBe("manage");
    expect(
      deriveWalkthroughPublicPageMode({
        appointment: { status: WalkthroughAppointmentStatus.RESCHEDULED },
      }),
    ).toBe("manage");
  });

  it("returns canceled for CANCELED", () => {
    expect(
      deriveWalkthroughPublicPageMode({
        appointment: { status: WalkthroughAppointmentStatus.CANCELED },
      }),
    ).toBe("canceled");
  });

  it("returns closed for COMPLETED and NO_SHOW", () => {
    expect(
      deriveWalkthroughPublicPageMode({
        appointment: { status: WalkthroughAppointmentStatus.COMPLETED },
      }),
    ).toBe("closed");
    expect(
      deriveWalkthroughPublicPageMode({
        appointment: { status: WalkthroughAppointmentStatus.NO_SHOW },
      }),
    ).toBe("closed");
  });
});

describe("isWalkthroughAppointmentManageable", () => {
  it("is true only for active scheduled statuses", () => {
    expect(isWalkthroughAppointmentManageable(WalkthroughAppointmentStatus.SCHEDULED)).toBe(
      true,
    );
    expect(isWalkthroughAppointmentManageable(WalkthroughAppointmentStatus.RESCHEDULED)).toBe(
      true,
    );
    expect(isWalkthroughAppointmentManageable(WalkthroughAppointmentStatus.CANCELED)).toBe(
      false,
    );
  });

  it("matches cancelable appointments", () => {
    expect(isWalkthroughAppointmentCancelable(WalkthroughAppointmentStatus.SCHEDULED)).toBe(
      true,
    );
    expect(isWalkthroughAppointmentCancelable(WalkthroughAppointmentStatus.CANCELED)).toBe(
      false,
    );
  });
});
