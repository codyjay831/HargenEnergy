import "server-only";

import {
  buildPublishIcsForAppointment,
  resolveWalkthroughAppointmentFromToken,
} from "@/lib/walkthrough-scheduling/calendar-ics-server";
import { walkthroughSchedulingUrl } from "@/lib/app-url";

export function walkthroughIcsResponse(ics: string) {
  return new Response(ics, {
    status: 200,
    headers: {
      "Content-Type": "text/calendar; charset=utf-8",
      "Content-Disposition": 'attachment; filename="hargen-walkthrough.ics"',
      "Cache-Control": "private, no-store",
    },
  });
}

export async function buildWalkthroughIcsResponseFromToken(rawToken: string) {
  const appointment = await resolveWalkthroughAppointmentFromToken(rawToken);
  if (!appointment) {
    return null;
  }

  const ics = buildPublishIcsForAppointment({
    ...appointment,
    manageUrl: walkthroughSchedulingUrl(rawToken),
  });

  return walkthroughIcsResponse(ics);
}
