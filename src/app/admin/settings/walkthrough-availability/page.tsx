import { CalendarClock } from "lucide-react";
import { getWalkthroughAvailabilitySettingsForAdmin } from "@/app/actions/walkthrough-scheduling-admin";
import { WalkthroughAvailabilityForm } from "@/components/admin/WalkthroughAvailabilityForm";
import { requireStaff } from "@/lib/auth-guards";
import { getWalkthroughSchedulingReadiness } from "@/lib/walkthrough-scheduling/scheduling-readiness";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Walkthrough availability – Hargen Admin",
  robots: { index: false, follow: false },
};

export default async function WalkthroughAvailabilitySettingsPage() {
  await requireStaff();

  const [settings, readiness] = await Promise.all([
    getWalkthroughAvailabilitySettingsForAdmin(),
    getWalkthroughSchedulingReadiness(),
  ]);

  return (
    <div className="max-w-3xl space-y-6">
      <div className="flex items-center gap-4">
        <div className="rounded-lg bg-primary/10 p-2">
          <CalendarClock className="h-6 w-6 text-primary" />
        </div>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Walkthrough availability</h1>
          <p className="text-muted-foreground">
            Configure when prospects can book walkthrough calls.
          </p>
        </div>
      </div>

      {!readiness.ready && readiness.blockers.length > 0 && (
        <div className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900">
          <p className="font-medium">Scheduling blockers</p>
          <ul className="mt-1 list-disc pl-4">
            {readiness.blockers.map((blocker) => (
              <li key={blocker}>{blocker}</li>
            ))}
          </ul>
        </div>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Availability settings</CardTitle>
          <CardDescription>
            Slots are generated from these windows, then filtered against Google Calendar busy times.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <WalkthroughAvailabilityForm
            initialSettings={{
              timezone: settings.timezone,
              slotDurationMinutes: settings.slotDurationMinutes,
              bufferBeforeMinutes: settings.bufferBeforeMinutes,
              bufferAfterMinutes: settings.bufferAfterMinutes,
              minimumNoticeHours: settings.minimumNoticeHours,
              bookingWindowDays: settings.bookingWindowDays,
              weekdayWindows: settings.weekdayWindows,
              blackoutDates: settings.blackoutDates,
              defaultMeetingUrl: settings.defaultMeetingUrl,
              defaultMeetingType: settings.defaultMeetingType,
              smsRemindersEnabled: settings.smsRemindersEnabled,
            }}
          />
        </CardContent>
      </Card>
    </div>
  );
}
