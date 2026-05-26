import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { listGoogleCalendars } from "@/lib/google-calendar/events";
import { getActiveGoogleCalendarConnection } from "@/lib/google-calendar/token-store";
import { writeAuditLog } from "@/lib/audit-log";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session?.user?.id || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = (await request.json()) as { calendarId?: string };
  const calendarId = body.calendarId?.trim();
  if (!calendarId) {
    return NextResponse.json({ error: "calendarId is required." }, { status: 400 });
  }

  const connection = await getActiveGoogleCalendarConnection();
  if (!connection) {
    return NextResponse.json({ error: "No Google Calendar connection." }, { status: 400 });
  }

  const calendars = await listGoogleCalendars(connection.id);
  const selected = calendars.find((item) => item.id === calendarId);
  if (!selected) {
    return NextResponse.json({ error: "Calendar not found." }, { status: 400 });
  }

  await prisma.googleCalendarConnection.update({
    where: { id: connection.id },
    data: {
      calendarId: selected.id,
      calendarName: selected.summary,
    },
  });

  await writeAuditLog({
    actorUserId: session.user.id,
    action: "google_calendar.calendar_selected",
    entityType: "GoogleCalendarConnection",
    entityId: connection.id,
    metadata: { calendarId: selected.id, calendarName: selected.summary },
  });

  return NextResponse.json({ success: true });
}
