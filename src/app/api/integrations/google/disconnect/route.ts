import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { disconnectGoogleCalendarConnection } from "@/lib/google-calendar/token-store";
import { writeAuditLog } from "@/lib/audit-log";

export const dynamic = "force-dynamic";

export async function POST() {
  const session = await auth();
  if (!session?.user?.id || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  await disconnectGoogleCalendarConnection(session.user.id);
  await writeAuditLog({
    actorUserId: session.user.id,
    action: "google_calendar.disconnected",
    entityType: "GoogleCalendarConnection",
    entityId: session.user.id,
  });

  return NextResponse.json({ success: true });
}
