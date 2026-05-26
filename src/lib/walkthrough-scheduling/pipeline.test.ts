import { describe, expect, it } from "vitest";
import { deriveWalkthroughPipelineStage } from "@/lib/walkthrough-scheduling/pipeline";
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
});
