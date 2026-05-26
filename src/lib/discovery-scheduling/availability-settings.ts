import "server-only";

import { prisma } from "@/lib/prisma";
import { getDefaultWeekdayWindows } from "@/lib/discovery-scheduling/scheduling-readiness";
import type { WeekdayWindows } from "@/lib/discovery-scheduling/types";

export async function getDiscoveryAvailabilitySettings() {
  const settings = await prisma.discoveryAvailabilitySettings.findUnique({
    where: { id: "default" },
  });

  if (!settings) {
    return null;
  }

  return {
    ...settings,
    weekdayWindows: settings.weekdayWindows as WeekdayWindows,
    blackoutDates: (settings.blackoutDates as string[]) ?? [],
  };
}

export async function ensureDiscoveryAvailabilitySettings() {
  const existing = await getDiscoveryAvailabilitySettings();
  if (existing) {
    return existing;
  }

  const created = await prisma.discoveryAvailabilitySettings.create({
    data: {
      id: "default",
      weekdayWindows: getDefaultWeekdayWindows(),
      blackoutDates: [],
    },
  });

  return {
    ...created,
    weekdayWindows: created.weekdayWindows as WeekdayWindows,
    blackoutDates: (created.blackoutDates as string[]) ?? [],
  };
}
