"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import {
  updateDiscoveryAvailabilitySettings,
  type DiscoveryAvailabilitySettingsInput,
} from "@/app/actions/discovery-scheduling-admin";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import type { WeekdayKey, WeekdayWindows } from "@/lib/discovery-scheduling/types";

const WEEKDAY_LABELS: Record<WeekdayKey, string> = {
  mon: "Monday",
  tue: "Tuesday",
  wed: "Wednesday",
  thu: "Thursday",
  fri: "Friday",
  sat: "Saturday",
  sun: "Sunday",
};

const WEEKDAY_KEYS: WeekdayKey[] = ["mon", "tue", "wed", "thu", "fri", "sat", "sun"];

export type DiscoveryAvailabilityFormSettings = {
  timezone: string;
  slotDurationMinutes: number;
  bufferBeforeMinutes: number;
  bufferAfterMinutes: number;
  minimumNoticeHours: number;
  bookingWindowDays: number;
  weekdayWindows: WeekdayWindows;
  blackoutDates: string[];
  defaultMeetingUrl: string | null;
  defaultMeetingType: string;
  smsRemindersEnabled: boolean;
};

interface DiscoveryAvailabilityFormProps {
  initialSettings: DiscoveryAvailabilityFormSettings;
}

type DayFormState = {
  enabled: boolean;
  start: string;
  end: string;
};

function buildDayState(windows: WeekdayWindows): Record<WeekdayKey, DayFormState> {
  return WEEKDAY_KEYS.reduce(
    (acc, key) => {
      const window = windows[key][0];
      acc[key] = {
        enabled: windows[key].length > 0,
        start: window?.start ?? "09:00",
        end: window?.end ?? "17:00",
      };
      return acc;
    },
    {} as Record<WeekdayKey, DayFormState>,
  );
}

function buildWeekdayWindows(dayState: Record<WeekdayKey, DayFormState>): WeekdayWindows {
  return WEEKDAY_KEYS.reduce((acc, key) => {
    const day = dayState[key];
    acc[key] = day.enabled ? [{ start: day.start, end: day.end }] : [];
    return acc;
  }, {} as WeekdayWindows);
}

export function DiscoveryAvailabilityForm({ initialSettings }: DiscoveryAvailabilityFormProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [timezone, setTimezone] = useState(initialSettings.timezone);
  const [slotDurationMinutes, setSlotDurationMinutes] = useState(
    String(initialSettings.slotDurationMinutes),
  );
  const [bufferBeforeMinutes, setBufferBeforeMinutes] = useState(
    String(initialSettings.bufferBeforeMinutes),
  );
  const [bufferAfterMinutes, setBufferAfterMinutes] = useState(
    String(initialSettings.bufferAfterMinutes),
  );
  const [minimumNoticeHours, setMinimumNoticeHours] = useState(
    String(initialSettings.minimumNoticeHours),
  );
  const [bookingWindowDays, setBookingWindowDays] = useState(
    String(initialSettings.bookingWindowDays),
  );
  const [defaultMeetingUrl, setDefaultMeetingUrl] = useState(
    initialSettings.defaultMeetingUrl ?? "",
  );
  const [defaultMeetingType, setDefaultMeetingType] = useState(initialSettings.defaultMeetingType);
  const [smsRemindersEnabled, setSmsRemindersEnabled] = useState(
    initialSettings.smsRemindersEnabled,
  );
  const [blackoutDatesText, setBlackoutDatesText] = useState(
    initialSettings.blackoutDates.join("\n"),
  );
  const [dayState, setDayState] = useState(() => buildDayState(initialSettings.weekdayWindows));

  const updateDay = (key: WeekdayKey, patch: Partial<DayFormState>) => {
    setDayState((current) => ({
      ...current,
      [key]: { ...current[key], ...patch },
    }));
  };

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const blackoutDates = blackoutDatesText
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter(Boolean);

    const payload: DiscoveryAvailabilitySettingsInput = {
      timezone,
      slotDurationMinutes: Number(slotDurationMinutes),
      bufferBeforeMinutes: Number(bufferBeforeMinutes),
      bufferAfterMinutes: Number(bufferAfterMinutes),
      minimumNoticeHours: Number(minimumNoticeHours),
      bookingWindowDays: Number(bookingWindowDays),
      weekdayWindows: buildWeekdayWindows(dayState),
      blackoutDates,
      defaultMeetingUrl: defaultMeetingUrl.trim() || null,
      defaultMeetingType,
      smsRemindersEnabled,
    };

    startTransition(async () => {
      try {
        await updateDiscoveryAvailabilitySettings(payload);
        toast.success("Availability settings saved");
        router.refresh();
      } catch {
        toast.error("Could not save availability settings");
      }
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="timezone">Timezone</Label>
          <Input
            id="timezone"
            value={timezone}
            onChange={(event) => setTimezone(event.target.value)}
            placeholder="America/Los_Angeles"
            required
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="slotDurationMinutes">Slot duration (minutes)</Label>
          <Input
            id="slotDurationMinutes"
            type="number"
            min={15}
            step={5}
            value={slotDurationMinutes}
            onChange={(event) => setSlotDurationMinutes(event.target.value)}
            required
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="bufferBeforeMinutes">Buffer before (minutes)</Label>
          <Input
            id="bufferBeforeMinutes"
            type="number"
            min={0}
            step={5}
            value={bufferBeforeMinutes}
            onChange={(event) => setBufferBeforeMinutes(event.target.value)}
            required
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="bufferAfterMinutes">Buffer after (minutes)</Label>
          <Input
            id="bufferAfterMinutes"
            type="number"
            min={0}
            step={5}
            value={bufferAfterMinutes}
            onChange={(event) => setBufferAfterMinutes(event.target.value)}
            required
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="minimumNoticeHours">Minimum notice (hours)</Label>
          <Input
            id="minimumNoticeHours"
            type="number"
            min={0}
            step={1}
            value={minimumNoticeHours}
            onChange={(event) => setMinimumNoticeHours(event.target.value)}
            required
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="bookingWindowDays">Booking window (days)</Label>
          <Input
            id="bookingWindowDays"
            type="number"
            min={1}
            step={1}
            value={bookingWindowDays}
            onChange={(event) => setBookingWindowDays(event.target.value)}
            required
          />
        </div>
      </div>

      <div className="space-y-3">
        <Label>Weekly availability</Label>
        <div className="space-y-2">
          {WEEKDAY_KEYS.map((key) => {
            const day = dayState[key];
            return (
              <div
                key={key}
                className="grid grid-cols-1 items-center gap-3 rounded-lg border p-3 md:grid-cols-[140px_1fr_1fr]"
              >
                <label className="flex items-center gap-2 text-sm font-medium">
                  <Checkbox
                    checked={day.enabled}
                    onCheckedChange={(checked) =>
                      updateDay(key, { enabled: checked === true })
                    }
                  />
                  {WEEKDAY_LABELS[key]}
                </label>
                <Input
                  type="time"
                  value={day.start}
                  disabled={!day.enabled}
                  onChange={(event) => updateDay(key, { start: event.target.value })}
                />
                <Input
                  type="time"
                  value={day.end}
                  disabled={!day.enabled}
                  onChange={(event) => updateDay(key, { end: event.target.value })}
                />
              </div>
            );
          })}
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="blackoutDates">Blackout dates</Label>
        <Textarea
          id="blackoutDates"
          value={blackoutDatesText}
          onChange={(event) => setBlackoutDatesText(event.target.value)}
          rows={4}
          placeholder="One YYYY-MM-DD date per line"
        />
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="defaultMeetingUrl">Default meeting URL</Label>
          <Input
            id="defaultMeetingUrl"
            value={defaultMeetingUrl}
            onChange={(event) => setDefaultMeetingUrl(event.target.value)}
            placeholder="Fallback Zoom/Meet link if Google Meet is unavailable"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="defaultMeetingType">Default meeting type</Label>
          <Input
            id="defaultMeetingType"
            value={defaultMeetingType}
            onChange={(event) => setDefaultMeetingType(event.target.value)}
          />
        </div>
      </div>

      <label className="flex items-center gap-2 text-sm">
        <Checkbox
          checked={smsRemindersEnabled}
          onCheckedChange={(checked) => setSmsRemindersEnabled(checked === true)}
        />
        Enable SMS reminders (when configured)
      </label>

      <Button type="submit" disabled={isPending}>
        {isPending ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Saving...
          </>
        ) : (
          "Save availability"
        )}
      </Button>
    </form>
  );
}
