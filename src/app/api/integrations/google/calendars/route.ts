import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { listGoogleCalendars } from "@/lib/google-calendar/events";
import { getActiveGoogleCalendarConnection } from "@/lib/google-calendar/token-store";

export const dynamic = "force-dynamic";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const connection = await getActiveGoogleCalendarConnection();
  if (!connection) {
    return NextResponse.json({ error: "No Google Calendar connection." }, { status: 400 });
  }

  const calendars = await listGoogleCalendars(connection.id);
  return NextResponse.json({ calendars });
}
