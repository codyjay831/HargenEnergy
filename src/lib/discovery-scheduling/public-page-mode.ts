import { DiscoveryAppointmentStatus } from "@/generated/prisma/client";

export type DiscoveryPublicPageMode = "book" | "manage" | "canceled" | "closed";

type LinkWithAppointment = {
  appointment: { status: DiscoveryAppointmentStatus } | null;
};

export function deriveDiscoveryPublicPageMode(
  link: LinkWithAppointment,
): DiscoveryPublicPageMode {
  const appointment = link.appointment;
  if (!appointment) {
    return "book";
  }

  switch (appointment.status) {
    case DiscoveryAppointmentStatus.SCHEDULED:
    case DiscoveryAppointmentStatus.RESCHEDULED:
      return "manage";
    case DiscoveryAppointmentStatus.CANCELED:
      return "canceled";
    case DiscoveryAppointmentStatus.COMPLETED:
    case DiscoveryAppointmentStatus.NO_SHOW:
      return "closed";
    default:
      return "closed";
  }
}

export function isDiscoveryAppointmentManageable(
  status: DiscoveryAppointmentStatus,
): boolean {
  return (
    status === DiscoveryAppointmentStatus.SCHEDULED ||
    status === DiscoveryAppointmentStatus.RESCHEDULED
  );
}

export function isDiscoveryAppointmentCancelable(
  status: DiscoveryAppointmentStatus,
): boolean {
  return isDiscoveryAppointmentManageable(status);
}
