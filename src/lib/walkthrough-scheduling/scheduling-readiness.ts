import "server-only";

import {
  GoogleCalendarConnectionStatus,
} from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";
import {
  DEFAULT_WEEKDAY_WINDOWS,
  isWalkthroughSchedulingEnabled,
} from "@/lib/walkthrough-scheduling/constants";
import type { WeekdayWindows } from "@/lib/walkthrough-scheduling/types";

export type WalkthroughSchedulingReadiness = {
  enabled: boolean;
  googleConnected: boolean;
  availabilityConfigured: boolean;
  meetFallbackRequired: boolean;
  fallbackUrlConfigured: boolean;
  ready: boolean;
  blockers: string[];
};

function isValidWeekdayWindows(value: unknown): value is WeekdayWindows {
  if (!value || typeof value !== "object") {
    return false;
  }
  const keys = ["mon", "tue", "wed", "thu", "fri", "sat", "sun"];
  return keys.every((key) => key in (value as Record<string, unknown>));
}

function meetFallbackRequiredFromConnection(connection: {
  meetCreationEnabled: boolean;
} | null): boolean {
  if (!connection) {
    return false;
  }
  return !connection.meetCreationEnabled;
}

export async function getWalkthroughSchedulingReadiness(): Promise<WalkthroughSchedulingReadiness> {
  const enabled = isWalkthroughSchedulingEnabled();
  const blockers: string[] = [];

  if (!enabled) {
    blockers.push("Walkthrough scheduling is not enabled.");
  }

  const connection = await prisma.googleCalendarConnection.findFirst({
    where: { status: GoogleCalendarConnectionStatus.CONNECTED },
    orderBy: { updatedAt: "desc" },
  });

  const googleConnected = Boolean(
    connection?.calendarId && connection.status === GoogleCalendarConnectionStatus.CONNECTED,
  );
  if (enabled && !googleConnected) {
    blockers.push("Connect Google Calendar and select a calendar.");
  }

  const settings = await prisma.walkthroughAvailabilitySettings.findUnique({
    where: { id: "default" },
  });

  const availabilityConfigured = Boolean(
    settings && isValidWeekdayWindows(settings.weekdayWindows),
  );
  if (enabled && !availabilityConfigured) {
    blockers.push("Configure walkthrough availability settings.");
  }

  const meetFallbackRequired = meetFallbackRequiredFromConnection(connection);
  const fallbackUrlConfigured = Boolean(settings?.defaultMeetingUrl?.trim());
  if (enabled && meetFallbackRequired && !fallbackUrlConfigured) {
    blockers.push(
      "Google Meet fallback is required. Set a default meeting URL in availability settings.",
    );
  }

  const ready =
    enabled &&
    googleConnected &&
    availabilityConfigured &&
    (!meetFallbackRequired || fallbackUrlConfigured);

  return {
    enabled,
    googleConnected,
    availabilityConfigured,
    meetFallbackRequired,
    fallbackUrlConfigured,
    ready,
    blockers,
  };
}

export function getDefaultWeekdayWindows(): WeekdayWindows {
  return structuredClone(DEFAULT_WEEKDAY_WINDOWS);
}
