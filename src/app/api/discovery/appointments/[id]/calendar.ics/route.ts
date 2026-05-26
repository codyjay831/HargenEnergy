import {
  buildPublishIcsForAppointment,
  loadDiscoveryAppointmentForCalendar,
} from "@/lib/discovery-scheduling/calendar-ics-server";
import { discoveryIcsResponse } from "@/lib/discovery-scheduling/calendar-ics-response";
import { verifyDiscoveryAppointmentCalendar } from "@/lib/discovery-scheduling/calendar-signature";

export const dynamic = "force-dynamic";

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function GET(request: Request, { params }: RouteParams) {
  const resolvedParams = await params;
  const appointmentId = typeof resolvedParams?.id === "string" ? resolvedParams.id : "";
  if (!appointmentId) {
    return new Response("Not found", { status: 404 });
  }

  const url = new URL(request.url);
  const signature = url.searchParams.get("sig")?.trim() ?? "";
  if (!signature || !verifyDiscoveryAppointmentCalendar(appointmentId, signature)) {
    return new Response("Not found", { status: 404 });
  }

  const appointment = await loadDiscoveryAppointmentForCalendar(appointmentId);
  if (!appointment) {
    return new Response("Not found", { status: 404 });
  }

  const ics = buildPublishIcsForAppointment(appointment);
  return discoveryIcsResponse(ics);
}
