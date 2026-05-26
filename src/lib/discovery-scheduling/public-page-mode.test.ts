import { describe, expect, it } from "vitest";
import {
  deriveDiscoveryPublicPageMode,
  isDiscoveryAppointmentCancelable,
  isDiscoveryAppointmentManageable,
} from "@/lib/discovery-scheduling/public-page-mode";
import { DiscoveryAppointmentStatus } from "@/generated/prisma/client";

describe("deriveDiscoveryPublicPageMode", () => {
  it("returns book when there is no appointment", () => {
    expect(deriveDiscoveryPublicPageMode({ appointment: null })).toBe("book");
  });

  it("returns manage for SCHEDULED and RESCHEDULED", () => {
    expect(
      deriveDiscoveryPublicPageMode({
        appointment: { status: DiscoveryAppointmentStatus.SCHEDULED },
      }),
    ).toBe("manage");
    expect(
      deriveDiscoveryPublicPageMode({
        appointment: { status: DiscoveryAppointmentStatus.RESCHEDULED },
      }),
    ).toBe("manage");
  });

  it("returns canceled for CANCELED", () => {
    expect(
      deriveDiscoveryPublicPageMode({
        appointment: { status: DiscoveryAppointmentStatus.CANCELED },
      }),
    ).toBe("canceled");
  });

  it("returns closed for COMPLETED and NO_SHOW", () => {
    expect(
      deriveDiscoveryPublicPageMode({
        appointment: { status: DiscoveryAppointmentStatus.COMPLETED },
      }),
    ).toBe("closed");
    expect(
      deriveDiscoveryPublicPageMode({
        appointment: { status: DiscoveryAppointmentStatus.NO_SHOW },
      }),
    ).toBe("closed");
  });
});

describe("isDiscoveryAppointmentManageable", () => {
  it("is true only for active scheduled statuses", () => {
    expect(isDiscoveryAppointmentManageable(DiscoveryAppointmentStatus.SCHEDULED)).toBe(
      true,
    );
    expect(isDiscoveryAppointmentManageable(DiscoveryAppointmentStatus.RESCHEDULED)).toBe(
      true,
    );
    expect(isDiscoveryAppointmentManageable(DiscoveryAppointmentStatus.CANCELED)).toBe(
      false,
    );
  });

  it("matches cancelable appointments", () => {
    expect(isDiscoveryAppointmentCancelable(DiscoveryAppointmentStatus.SCHEDULED)).toBe(
      true,
    );
    expect(isDiscoveryAppointmentCancelable(DiscoveryAppointmentStatus.CANCELED)).toBe(
      false,
    );
  });
});
