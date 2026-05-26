import { WalkthroughAppointmentStatus } from "@/generated/prisma/client";

export type WalkthroughPublicPageMode = "book" | "manage" | "canceled" | "closed";

type LinkWithAppointment = {
  appointment: { status: WalkthroughAppointmentStatus } | null;
};

export function deriveWalkthroughPublicPageMode(
  link: LinkWithAppointment,
): WalkthroughPublicPageMode {
  const appointment = link.appointment;
  if (!appointment) {
    return "book";
  }

  switch (appointment.status) {
    case WalkthroughAppointmentStatus.SCHEDULED:
    case WalkthroughAppointmentStatus.RESCHEDULED:
      return "manage";
    case WalkthroughAppointmentStatus.CANCELED:
      return "canceled";
    case WalkthroughAppointmentStatus.COMPLETED:
    case WalkthroughAppointmentStatus.NO_SHOW:
      return "closed";
    default:
      return "closed";
  }
}

export function isWalkthroughAppointmentManageable(
  status: WalkthroughAppointmentStatus,
): boolean {
  return (
    status === WalkthroughAppointmentStatus.SCHEDULED ||
    status === WalkthroughAppointmentStatus.RESCHEDULED
  );
}

export function isWalkthroughAppointmentCancelable(
  status: WalkthroughAppointmentStatus,
): boolean {
  return isWalkthroughAppointmentManageable(status);
}
