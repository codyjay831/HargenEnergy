import { describe, expect, it } from "vitest";
import {
  deriveDiscoveryPipelineStage,
  pickDiscoveryAppointmentForPipeline,
} from "@/lib/discovery-scheduling/pipeline";
import {
  ClientStatus,
  RequestStatus,
  DiscoveryAppointmentStatus,
  DiscoverySchedulingLinkStatus,
} from "@/generated/prisma/client";

describe("deriveDiscoveryPipelineStage", () => {
  it("returns new_request for unreviewed intake", () => {
    expect(
      deriveDiscoveryPipelineStage({
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
      deriveDiscoveryPipelineStage({
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
      deriveDiscoveryPipelineStage({
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
      deriveDiscoveryPipelineStage({
        clientStatus: ClientStatus.LEAD,
        requestStatus: RequestStatus.REVIEWED,
        linkStatus: DiscoverySchedulingLinkStatus.ACTIVE,
        appointmentStatus: null,
        fitDecision: null,
        recapSentAt: null,
      }),
    ).toBe("link_sent");
  });

  it("returns link_sent for NEW intake with active self-serve link", () => {
    expect(
      deriveDiscoveryPipelineStage({
        clientStatus: ClientStatus.LEAD,
        requestStatus: RequestStatus.NEW,
        linkStatus: DiscoverySchedulingLinkStatus.ACTIVE,
        appointmentStatus: null,
        fitDecision: null,
        recapSentAt: null,
      }),
    ).toBe("link_sent");
  });

  it("returns scheduled when appointment exists", () => {
    expect(
      deriveDiscoveryPipelineStage({
        clientStatus: ClientStatus.LEAD,
        requestStatus: RequestStatus.REVIEWED,
        linkStatus: DiscoverySchedulingLinkStatus.USED,
        appointmentStatus: DiscoveryAppointmentStatus.SCHEDULED,
        fitDecision: null,
        recapSentAt: null,
      }),
    ).toBe("scheduled");
  });

  it("returns booking_canceled when appointment is canceled", () => {
    expect(
      deriveDiscoveryPipelineStage({
        clientStatus: ClientStatus.LEAD,
        requestStatus: RequestStatus.REVIEWED,
        linkStatus: DiscoverySchedulingLinkStatus.USED,
        appointmentStatus: DiscoveryAppointmentStatus.CANCELED,
        fitDecision: null,
        recapSentAt: null,
      }),
    ).toBe("booking_canceled");
  });

  it("returns booking_canceled when link is USED without active appointment", () => {
    expect(
      deriveDiscoveryPipelineStage({
        clientStatus: ClientStatus.LEAD,
        requestStatus: RequestStatus.REVIEWED,
        linkStatus: DiscoverySchedulingLinkStatus.USED,
        appointmentStatus: null,
        fitDecision: null,
        recapSentAt: null,
      }),
    ).toBe("booking_canceled");
  });
});

describe("pickDiscoveryAppointmentForPipeline", () => {
  it("prefers active booking over newer canceled row", () => {
    const picked = pickDiscoveryAppointmentForPipeline([
      {
        status: DiscoveryAppointmentStatus.CANCELED,
        createdAt: new Date("2026-05-27T12:00:00Z"),
      },
      {
        status: DiscoveryAppointmentStatus.SCHEDULED,
        createdAt: new Date("2026-05-27T10:00:00Z"),
      },
    ]);
    expect(picked?.status).toBe(DiscoveryAppointmentStatus.SCHEDULED);
  });
});
