import "server-only";

import { prisma } from "@/lib/prisma";
import { getDefaultWeekdayWindows } from "@/lib/walkthrough-scheduling/scheduling-readiness";
import type { WeekdayWindows } from "@/lib/walkthrough-scheduling/types";

export async function getWalkthroughAvailabilitySettings() {
  const settings = await prisma.walkthroughAvailabilitySettings.findUnique({
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

export async function ensureWalkthroughAvailabilitySettings() {
  const existing = await getWalkthroughAvailabilitySettings();
  if (existing) {
    return existing;
  }

  const created = await prisma.walkthroughAvailabilitySettings.create({
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
