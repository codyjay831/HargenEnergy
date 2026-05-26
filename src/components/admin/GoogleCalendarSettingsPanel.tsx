"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button, buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

type CalendarOption = {
  id: string;
  summary: string;
  primary: boolean;
};

interface GoogleCalendarSettingsPanelProps {
  connected: boolean;
  selectedCalendarId?: string | null;
}

function ConnectedCalendarPicker({
  selectedCalendarId,
}: {
  selectedCalendarId?: string | null;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [calendars, setCalendars] = useState<CalendarOption[]>([]);
  const [loadingCalendars, setLoadingCalendars] = useState(true);
  const [calendarId, setCalendarId] = useState(selectedCalendarId ?? "");

  useEffect(() => {
    let cancelled = false;

    fetch("/api/integrations/google/calendars")
      .then(async (response) => {
        if (!response.ok) {
          throw new Error("Failed to load calendars");
        }
        const data = (await response.json()) as { calendars?: CalendarOption[] };
        if (!cancelled) {
          setCalendars(data.calendars ?? []);
        }
      })
      .catch(() => {
        if (!cancelled) {
          toast.error("Could not load Google calendars");
        }
      })
      .finally(() => {
        if (!cancelled) {
          setLoadingCalendars(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, []);

  const handleDisconnect = () => {
    startTransition(async () => {
      const response = await fetch("/api/integrations/google/disconnect", {
        method: "POST",
      });
      if (!response.ok) {
        toast.error("Could not disconnect Google Calendar");
        return;
      }
      toast.success("Google Calendar disconnected");
      router.refresh();
    });
  };

  const handleSaveCalendar = () => {
    if (!calendarId) {
      toast.error("Select a calendar first");
      return;
    }

    startTransition(async () => {
      const response = await fetch("/api/integrations/google/select-calendar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ calendarId }),
      });
      const data = (await response.json()) as { error?: string };
      if (!response.ok) {
        toast.error(data.error ?? "Could not save calendar selection");
        return;
      }
      toast.success("Calendar saved");
      router.refresh();
    });
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2">
        <a
          href="/api/integrations/google/connect"
          className={cn(buttonVariants({ variant: "outline" }))}
        >
          Reconnect
        </a>
        <Button variant="outline" disabled={isPending} onClick={handleDisconnect}>
          {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Disconnect"}
        </Button>
      </div>

      <div className="space-y-2">
        <Label htmlFor="calendarId">Booking calendar</Label>
        {loadingCalendars ? (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            Loading calendars...
          </div>
        ) : (
          <Select
            value={calendarId}
            onValueChange={(value) => setCalendarId(value ?? "")}
          >
            <SelectTrigger id="calendarId">
              <SelectValue placeholder="Select a calendar" />
            </SelectTrigger>
            <SelectContent>
              {calendars.map((calendar) => (
                <SelectItem key={calendar.id} value={calendar.id}>
                  {calendar.summary}
                  {calendar.primary ? " (primary)" : ""}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
        <Button disabled={isPending || !calendarId || loadingCalendars} onClick={handleSaveCalendar}>
          Save calendar
        </Button>
      </div>
    </div>
  );
}

export function GoogleCalendarSettingsPanel({
  connected,
  selectedCalendarId,
}: GoogleCalendarSettingsPanelProps) {
  if (!connected) {
    return (
      <a href="/api/integrations/google/connect" className={cn(buttonVariants())}>
        Connect Google Calendar
      </a>
    );
  }

  return <ConnectedCalendarPicker selectedCalendarId={selectedCalendarId} />;
}
