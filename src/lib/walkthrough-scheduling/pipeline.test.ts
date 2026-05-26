import { describe, expect, it } from "vitest";
import {
  deriveWalkthroughPipelineStage,
  pickWalkthroughAppointmentForPipeline,
} from "@/lib/walkthrough-scheduling/pipeline";
import {
  ClientStatus,
  RequestStatus,
  WalkthroughAppointmentStatus,
  WalkthroughSchedulingLinkStatus,
} from "@/generated/prisma/client";

describe("deriveWalkthroughPipelineStage", () => {
  it("returns new_request for unreviewed intake", () => {
    expect(
      deriveWalkthroughPipelineStage({
        clientStatus: ClientStatus.LEAD,
        requestStatus: RequestStatus.NEW,
        linkStatus: null,
        appointmentStatus: null,
        fitDecision: null,
        recapSentAt: null,
      }),
    ).toBe("new_request");
  });

  it("returns awaiting_info when needs more information", () => {
    expect(
      deriveWalkthroughPipelineStage({
        clientStatus: ClientStatus.LEAD,
        requestStatus: RequestStatus.NEEDS_INFO,
        linkStatus: null,
        appointmentStatus: null,
        fitDecision: null,
        recapSentAt: null,
      }),
    ).toBe("awaiting_info");
  });

  it("returns qualified for reviewed intake without link", () => {
    expect(
      deriveWalkthroughPipelineStage({
        clientStatus: ClientStatus.LEAD,
        requestStatus: RequestStatus.REVIEWED,
        linkStatus: null,
        appointmentStatus: null,
        fitDecision: null,
        recapSentAt: null,
      }),
    ).toBe("qualified");
  });

  it("returns link_sent when active link exists", () => {
    expect(
      deriveWalkthroughPipelineStage({
        clientStatus: ClientStatus.LEAD,
        requestStatus: RequestStatus.REVIEWED,
        linkStatus: WalkthroughSchedulingLinkStatus.ACTIVE,
        appointmentStatus: null,
        fitDecision: null,
        recapSentAt: null,
      }),
    ).toBe("link_sent");
  });

  it("returns scheduled when appointment exists", () => {
    expect(
      deriveWalkthroughPipelineStage({
        clientStatus: ClientStatus.LEAD,
        requestStatus: RequestStatus.REVIEWED,
        linkStatus: WalkthroughSchedulingLinkStatus.USED,
        appointmentStatus: WalkthroughAppointmentStatus.SCHEDULED,
        fitDecision: null,
        recapSentAt: null,
      }),
    ).toBe("scheduled");
  });

  it("returns booking_canceled when appointment is canceled", () => {
    expect(
      deriveWalkthroughPipelineStage({
        clientStatus: ClientStatus.LEAD,
        requestStatus: RequestStatus.REVIEWED,
        linkStatus: WalkthroughSchedulingLinkStatus.USED,
        appointmentStatus: WalkthroughAppointmentStatus.CANCELED,
        fitDecision: null,
        recapSentAt: null,
      }),
    ).toBe("booking_canceled");
  });

  it("returns booking_canceled when link is USED without active appointment", () => {
    expect(
      deriveWalkthroughPipelineStage({
        clientStatus: ClientStatus.LEAD,
        requestStatus: RequestStatus.REVIEWED,
        linkStatus: WalkthroughSchedulingLinkStatus.USED,
        appointmentStatus: null,
        fitDecision: null,
        recapSentAt: null,
      }),
    ).toBe("booking_canceled");
  });
});

describe("pickWalkthroughAppointmentForPipeline", () => {
  it("prefers active booking over newer canceled row", () => {
    const picked = pickWalkthroughAppointmentForPipeline([
      {
        status: WalkthroughAppointmentStatus.CANCELED,
        createdAt: new Date("2026-05-27T12:00:00Z"),
      },
      {
        status: WalkthroughAppointmentStatus.SCHEDULED,
        createdAt: new Date("2026-05-27T10:00:00Z"),
      },
    ]);
    expect(picked?.status).toBe(WalkthroughAppointmentStatus.SCHEDULED);
  });
});
