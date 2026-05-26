import Link from "next/link";
import { Calendar, CheckCircle2 } from "lucide-react";
import { requireStaff } from "@/lib/auth-guards";
import { getActiveGoogleCalendarConnection } from "@/lib/google-calendar/token-store";
import { getWalkthroughSchedulingReadiness } from "@/lib/walkthrough-scheduling/scheduling-readiness";
import { GoogleCalendarSettingsPanel } from "@/components/admin/GoogleCalendarSettingsPanel";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Calendar settings – Hargen Admin",
  robots: { index: false, follow: false },
};

const ERROR_MESSAGES: Record<string, string> = {
  oauth_failed: "Google sign-in failed. Try again.",
  oauth_not_configured: "Google OAuth is not configured in this environment.",
  missing_refresh_token: "Google did not return a refresh token. Disconnect and reconnect.",
};

interface CalendarSettingsPageProps {
  searchParams: Promise<{ connected?: string; error?: string }>;
}

export default async function CalendarSettingsPage({ searchParams }: CalendarSettingsPageProps) {
  await requireStaff();

  const resolvedSearchParams = await searchParams;
  const [connection, readiness] = await Promise.all([
    getActiveGoogleCalendarConnection(),
    getWalkthroughSchedulingReadiness(),
  ]);

  const connected = Boolean(connection);
  const calendarSelected = Boolean(connection?.calendarId);
  const successMessage =
    resolvedSearchParams.connected === "1" ? "Google Calendar connected successfully." : undefined;
  const errorMessage = resolvedSearchParams.error
    ? ERROR_MESSAGES[resolvedSearchParams.error] ?? "Something went wrong with Google Calendar."
    : undefined;

  return (
    <div className="max-w-2xl space-y-6">
      <div className="flex items-center gap-4">
        <div className="rounded-lg bg-primary/10 p-2">
          <Calendar className="h-6 w-6 text-primary" />
        </div>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Google Calendar</h1>
          <p className="text-muted-foreground">
            Connect Google Calendar for walkthrough booking and availability checks.
          </p>
        </div>
      </div>

      {successMessage && (
        <div className="flex items-start gap-2 rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-800">
          <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />
          {successMessage}
        </div>
      )}

      {errorMessage && (
        <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">
          {errorMessage}
        </div>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Connection</CardTitle>
          <CardDescription>
            Walkthrough scheduling uses this calendar for free/busy checks and event creation.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap items-center gap-2 text-sm">
            <span className="text-muted-foreground">Status</span>
            {connected ? (
              <Badge>Connected{connection?.googleAccountEmail ? ` · ${connection.googleAccountEmail}` : ""}</Badge>
            ) : (
              <Badge variant="secondary">Not connected</Badge>
            )}
          </div>

          {connected && connection?.calendarName && (
            <p className="text-sm text-muted-foreground">
              Selected calendar: <span className="font-medium text-foreground">{connection.calendarName}</span>
            </p>
          )}

          <GoogleCalendarSettingsPanel
            connected={connected}
            selectedCalendarId={connection?.calendarId}
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Scheduling readiness</CardTitle>
          <CardDescription>
            Calendar connection is one requirement for sending walkthrough scheduling links.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3 text-sm">
          <div className="flex items-center justify-between border-b py-2">
            <span className="text-muted-foreground">Google connected</span>
            <Badge variant={readiness.googleConnected ? "default" : "secondary"}>
              {readiness.googleConnected ? "Ready" : "Missing"}
            </Badge>
          </div>
          <div className="flex items-center justify-between border-b py-2">
            <span className="text-muted-foreground">Calendar selected</span>
            <Badge variant={calendarSelected ? "default" : "secondary"}>
              {calendarSelected ? "Ready" : "Missing"}
            </Badge>
          </div>
          <div className="flex items-center justify-between py-2">
            <span className="text-muted-foreground">Availability configured</span>
            <Badge variant={readiness.availabilityConfigured ? "default" : "secondary"}>
              {readiness.availabilityConfigured ? "Ready" : "Missing"}
            </Badge>
          </div>

          {!readiness.ready && readiness.blockers.length > 0 && (
            <ul className="list-disc space-y-1 pl-5 text-muted-foreground">
              {readiness.blockers.map((blocker) => (
                <li key={blocker}>{blocker}</li>
              ))}
            </ul>
          )}

          <Link href="/admin/settings/walkthrough-availability" className="text-sm text-primary hover:underline">
            Configure walkthrough availability
          </Link>
        </CardContent>
      </Card>
    </div>
  );
}
