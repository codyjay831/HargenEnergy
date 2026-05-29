import { describe, expect, it } from "vitest";
import {
  getSlotDayKey,
  groupDiscoveryDayGroupsByMonth,
  groupDiscoverySlotsByDay,
} from "@/lib/discovery-scheduling/group-slots-by-day";

describe("groupDiscoverySlotsByDay", () => {
  it("groups slots by local calendar day and sorts chronologically", () => {
    const slots = [
      {
        startUtc: "2026-06-02T17:00:00.000Z",
        endUtc: "2026-06-02T17:45:00.000Z",
        displayTimezone: "America/Los_Angeles",
      },
      {
        startUtc: "2026-05-30T16:00:00.000Z",
        endUtc: "2026-05-30T16:45:00.000Z",
        displayTimezone: "America/Los_Angeles",
      },
      {
        startUtc: "2026-05-30T17:30:00.000Z",
        endUtc: "2026-05-30T18:15:00.000Z",
        displayTimezone: "America/Los_Angeles",
      },
    ];

    const groups = groupDiscoverySlotsByDay(slots);

    expect(groups).toHaveLength(2);
    expect(groups[0].dayKey).toBe("2026-05-30");
    expect(groups[0].slots).toHaveLength(2);
    expect(groups[1].dayKey).toBe("2026-06-02");
    expect(groups[0].slots[0].startUtc).toBe("2026-05-30T16:00:00.000Z");
  });

  it("assigns month keys for cross-month windows", () => {
    const slots = [
      {
        startUtc: "2026-05-30T16:00:00.000Z",
        endUtc: "2026-05-30T16:45:00.000Z",
        displayTimezone: "America/Los_Angeles",
      },
      {
        startUtc: "2026-06-02T17:00:00.000Z",
        endUtc: "2026-06-02T17:45:00.000Z",
        displayTimezone: "America/Los_Angeles",
      },
    ];

    const groups = groupDiscoverySlotsByDay(slots);
    const months = groupDiscoveryDayGroupsByMonth(groups);

    expect(months).toHaveLength(2);
    expect(months[0].monthKey).toBe("2026-05");
    expect(months[1].monthKey).toBe("2026-06");
  });
});

describe("getSlotDayKey", () => {
  it("uses display timezone for day boundaries", () => {
    const slot = {
      startUtc: "2026-06-03T06:30:00.000Z",
      endUtc: "2026-06-03T07:15:00.000Z",
      displayTimezone: "America/Los_Angeles",
    };

    expect(getSlotDayKey(slot)).toBe("2026-06-02");
  });
});
