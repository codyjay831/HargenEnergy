import "server-only";

import { DiscoveryAppointmentStatus } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";
import {
  buildGoogleCalendarUrl,
  buildDiscoveryEventDescription,
  buildDiscoveryEventSummary,
  buildDiscoveryIcs,
  discoveryEventUid,
} from "@/lib/discovery-scheduling/calendar-ics";
import {
  hashSchedulingToken,
  isSchedulingLinkExpired,
} from "@/lib/discovery-scheduling/tokens";

export type DiscoveryCalendarAppointmentInput = {
  appointmentId: string;
  companyName: string;
  startUtc: Date;
  endUtc: Date;
  meetingUrl: string | null;
  schedulingLinkId: string | null;
};

export async function loadDiscoveryAppointmentForCalendar(appointmentId: string) {
  const appointment = await prisma.discoveryAppointment.findUnique({
    where: { id: appointmentId },
    include: { client: true },
  });
  if (!appointment) {
    return null;
  }
  if (appointment.status === DiscoveryAppointmentStatus.CANCELED) {
    return null;
  }

  return {
    appointmentId: appointment.id,
    companyName: appointment.client.companyName,
    startUtc: appointment.scheduledStartUtc,
    endUtc: appointment.scheduledEndUtc,
    meetingUrl: appointment.meetingUrl,
    schedulingLinkId: appointment.schedulingLinkId,
  } satisfies DiscoveryCalendarAppointmentInput;
}

export async function resolveDiscoveryAppointmentFromToken(rawToken: string) {
  const tokenHash = hashSchedulingToken(rawToken);
  const link = await prisma.discoverySchedulingLink.findUnique({
    where: { tokenHash },
    include: {
      client: true,
      appointment: true,
    },
  });
  if (!link?.appointment) {
    return null;
  }
  if (link.status === "EXPIRED" || link.status === "REVOKED") {
    return null;
  }
  if (link.status === "ACTIVE" && isSchedulingLinkExpired(link.expiresAt)) {
    return null;
  }
  if (link.appointment.status === DiscoveryAppointmentStatus.CANCELED) {
    return null;
  }

  return {
    appointmentId: link.appointment.id,
    companyName: link.client.companyName,
    startUtc: link.appointment.scheduledStartUtc,
    endUtc: link.appointment.scheduledEndUtc,
    meetingUrl: link.appointment.meetingUrl,
    schedulingLinkId: link.appointment.schedulingLinkId,
  } satisfies DiscoveryCalendarAppointmentInput;
}

export function buildPublishIcsForAppointment(
  input: DiscoveryCalendarAppointmentInput & { manageUrl?: string | null; sequence?: number },
): string {
  const summary = buildDiscoveryEventSummary(input.companyName);
  const description = buildDiscoveryEventDescription({
    companyName: input.companyName,
    meetingUrl: input.meetingUrl,
    manageUrl: input.manageUrl,
  });

  return buildDiscoveryIcs({
    uid: discoveryEventUid(input.appointmentId),
    sequence: input.sequence ?? 0,
    method: "PUBLISH",
    summary,
    description,
    startUtc: input.startUtc,
    endUtc: input.endUtc,
    location: input.meetingUrl,
  });
}

export function buildCancelIcsForAppointment(
  input: DiscoveryCalendarAppointmentInput & { sequence?: number },
): string {
  const summary = buildDiscoveryEventSummary(input.companyName);
  const description = buildDiscoveryEventDescription({
    companyName: input.companyName,
    meetingUrl: input.meetingUrl,
  });

  return buildDiscoveryIcs({
    uid: discoveryEventUid(input.appointmentId),
    sequence: input.sequence ?? 0,
    method: "CANCEL",
    summary,
    description,
    startUtc: input.startUtc,
    endUtc: input.endUtc,
    location: input.meetingUrl,
    status: "CANCELLED",
  });
}

export function buildDiscoveryCalendarArtifacts(
  input: DiscoveryCalendarAppointmentInput & { manageUrl?: string | null },
) {
  const summary = buildDiscoveryEventSummary(input.companyName);
  const description = buildDiscoveryEventDescription({
    companyName: input.companyName,
    meetingUrl: input.meetingUrl,
    manageUrl: input.manageUrl,
  });

  return {
    summary,
    description,
    publishIcs: buildPublishIcsForAppointment(input),
    googleUrl: buildGoogleCalendarUrl({
      summary,
      description,
      startUtc: input.startUtc,
      endUtc: input.endUtc,
      location: input.meetingUrl,
    }),
  };
}
