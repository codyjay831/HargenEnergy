import "server-only";

import {
  buildPublishIcsForAppointment,
  resolveDiscoveryAppointmentFromToken,
} from "@/lib/discovery-scheduling/calendar-ics-server";
import { discoverySchedulingUrl } from "@/lib/app-url";

export function discoveryIcsResponse(ics: string) {
  return new Response(ics, {
    status: 200,
    headers: {
      "Content-Type": "text/calendar; charset=utf-8",
      "Content-Disposition": 'attachment; filename="hargen-discovery.ics"',
      "Cache-Control": "private, no-store",
    },
  });
}

export async function buildDiscoveryIcsResponseFromToken(rawToken: string) {
  const appointment = await resolveDiscoveryAppointmentFromToken(rawToken);
  if (!appointment) {
    return null;
  }

  const ics = buildPublishIcsForAppointment({
    ...appointment,
    manageUrl: discoverySchedulingUrl(rawToken),
  });

  return discoveryIcsResponse(ics);
}
