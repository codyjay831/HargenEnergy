import "server-only";

import { WalkthroughAppointmentStatus } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";
import {
  buildGoogleCalendarUrl,
  buildWalkthroughEventDescription,
  buildWalkthroughEventSummary,
  buildWalkthroughIcs,
  walkthroughEventUid,
} from "@/lib/walkthrough-scheduling/calendar-ics";
import {
  hashSchedulingToken,
  isSchedulingLinkExpired,
} from "@/lib/walkthrough-scheduling/tokens";

export type WalkthroughCalendarAppointmentInput = {
  appointmentId: string;
  companyName: string;
  startUtc: Date;
  endUtc: Date;
  meetingUrl: string | null;
  schedulingLinkId: string | null;
};

export async function loadWalkthroughAppointmentForCalendar(appointmentId: string) {
  const appointment = await prisma.walkthroughAppointment.findUnique({
    where: { id: appointmentId },
    include: { client: true },
  });
  if (!appointment) {
    return null;
  }
  if (appointment.status === WalkthroughAppointmentStatus.CANCELED) {
    return null;
  }

  return {
    appointmentId: appointment.id,
    companyName: appointment.client.companyName,
    startUtc: appointment.scheduledStartUtc,
    endUtc: appointment.scheduledEndUtc,
    meetingUrl: appointment.meetingUrl,
    schedulingLinkId: appointment.schedulingLinkId,
  } satisfies WalkthroughCalendarAppointmentInput;
}

export async function resolveWalkthroughAppointmentFromToken(rawToken: string) {
  const tokenHash = hashSchedulingToken(rawToken);
  const link = await prisma.walkthroughSchedulingLink.findUnique({
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
  if (link.appointment.status === WalkthroughAppointmentStatus.CANCELED) {
    return null;
  }

  return {
    appointmentId: link.appointment.id,
    companyName: link.client.companyName,
    startUtc: link.appointment.scheduledStartUtc,
    endUtc: link.appointment.scheduledEndUtc,
    meetingUrl: link.appointment.meetingUrl,
    schedulingLinkId: link.appointment.schedulingLinkId,
  } satisfies WalkthroughCalendarAppointmentInput;
}

export function buildPublishIcsForAppointment(
  input: WalkthroughCalendarAppointmentInput & { manageUrl?: string | null; sequence?: number },
): string {
  const summary = buildWalkthroughEventSummary(input.companyName);
  const description = buildWalkthroughEventDescription({
    companyName: input.companyName,
    meetingUrl: input.meetingUrl,
    manageUrl: input.manageUrl,
  });

  return buildWalkthroughIcs({
    uid: walkthroughEventUid(input.appointmentId),
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
  input: WalkthroughCalendarAppointmentInput & { sequence?: number },
): string {
  const summary = buildWalkthroughEventSummary(input.companyName);
  const description = buildWalkthroughEventDescription({
    companyName: input.companyName,
    meetingUrl: input.meetingUrl,
  });

  return buildWalkthroughIcs({
    uid: walkthroughEventUid(input.appointmentId),
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

export function buildWalkthroughCalendarArtifacts(
  input: WalkthroughCalendarAppointmentInput & { manageUrl?: string | null },
) {
  const summary = buildWalkthroughEventSummary(input.companyName);
  const description = buildWalkthroughEventDescription({
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
