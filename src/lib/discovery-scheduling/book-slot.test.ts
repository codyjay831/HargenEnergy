import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  DiscoveryReminderChannel,
  DiscoveryReminderStatus,
  DiscoveryReminderType,
} from "@/generated/prisma/client";

vi.mock("server-only", () => ({}));

vi.mock("@/lib/prisma", () => ({
  prisma: {},
}));

vi.mock("@/lib/discovery-scheduling/availability-settings", () => ({
  getDiscoveryAvailabilitySettings: vi.fn(),
}));

vi.mock("@/lib/google-calendar/token-store", () => ({
  getActiveGoogleCalendarConnection: vi.fn(),
}));

vi.mock("@/lib/google-calendar/events", () => ({
  createDiscoveryCalendarEvent: vi.fn(),
  cancelDiscoveryCalendarEvent: vi.fn(),
}));

vi.mock("@/lib/google-calendar/freebusy", () => ({
  fetchGoogleFreeBusy: vi.fn(),
}));

vi.mock("@/lib/discovery-scheduling/slot-generator", () => ({
  generateAvailabilitySlots: vi.fn(),
  isSlotStillAvailable: vi.fn(),
}));

const {
  buildReminderRows,
  upsertDiscoveryReminderRows,
} = await import("@/lib/discovery-scheduling/book-slot");

describe("upsertDiscoveryReminderRows", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("upserts each row by appointmentId_type_channel (never createMany)", async () => {
    const upsert = vi.fn().mockResolvedValue({});
    const rows = [
      {
        appointmentId: "appt-1",
        type: DiscoveryReminderType.CONFIRMATION,
        channel: DiscoveryReminderChannel.EMAIL,
        scheduledFor: new Date("2026-05-27T12:00:00.000Z"),
        status: DiscoveryReminderStatus.PENDING,
      },
      {
        appointmentId: "appt-1",
        type: DiscoveryReminderType.TWENTY_FOUR_HOUR,
        channel: DiscoveryReminderChannel.EMAIL,
        scheduledFor: new Date("2026-05-28T16:00:00.000Z"),
        status: DiscoveryReminderStatus.PENDING,
      },
    ];

    await upsertDiscoveryReminderRows({ discoveryReminder: { upsert } }, rows);

    expect(upsert).toHaveBeenCalledTimes(2);
    expect(upsert).toHaveBeenNthCalledWith(1, {
      where: {
        appointmentId_type_channel: {
          appointmentId: "appt-1",
          type: DiscoveryReminderType.CONFIRMATION,
          channel: DiscoveryReminderChannel.EMAIL,
        },
      },
      create: rows[0],
      update: {
        scheduledFor: rows[0].scheduledFor,
        status: rows[0].status,
        sentAt: null,
        error: null,
      },
    });
    expect(upsert).toHaveBeenNthCalledWith(2, {
      where: {
        appointmentId_type_channel: {
          appointmentId: "appt-1",
          type: DiscoveryReminderType.TWENTY_FOUR_HOUR,
          channel: DiscoveryReminderChannel.EMAIL,
        },
      },
      create: rows[1],
      update: {
        scheduledFor: rows[1].scheduledFor,
        status: rows[1].status,
        sentAt: null,
        error: null,
      },
    });
  });

  it("can run twice for the same rows without createMany (upsert is idempotent)", async () => {
    const upsert = vi.fn().mockResolvedValue({});
    const rows = [
      {
        appointmentId: "appt-1",
        type: DiscoveryReminderType.CONFIRMATION,
        channel: DiscoveryReminderChannel.EMAIL,
        scheduledFor: new Date("2026-05-27T12:00:00.000Z"),
        status: DiscoveryReminderStatus.PENDING,
      },
    ];
    const tx = { discoveryReminder: { upsert } };

    await upsertDiscoveryReminderRows(tx, rows);
    await upsertDiscoveryReminderRows(tx, rows);

    expect(upsert).toHaveBeenCalledTimes(2);
  });

  it("resets sentAt and error when upserting over existing skipped reminders", async () => {
    const upsert = vi.fn().mockResolvedValue({});
    const row = {
      appointmentId: "appt-1",
      type: DiscoveryReminderType.ONE_HOUR,
      channel: DiscoveryReminderChannel.EMAIL,
      scheduledFor: new Date("2026-05-29T15:00:00.000Z"),
      status: DiscoveryReminderStatus.PENDING,
    };

    await upsertDiscoveryReminderRows({ discoveryReminder: { upsert } }, [row]);

    expect(upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        update: {
          scheduledFor: row.scheduledFor,
          status: DiscoveryReminderStatus.PENDING,
          sentAt: null,
          error: null,
        },
      }),
    );
  });
});

describe("buildReminderRows", () => {
  const now = new Date("2026-05-27T12:00:00.000Z");
  const startUtc = new Date("2026-05-29T16:00:00.000Z");

  it("includes confirmation and future reminders for a later appointment", () => {
    const rows = buildReminderRows("appt-1", startUtc, now);
    expect(rows.map((r) => `${r.type}:${r.channel}`)).toEqual([
      "CONFIRMATION:EMAIL",
      "TWENTY_FOUR_HOUR:EMAIL",
      "ONE_HOUR:EMAIL",
    ]);
  });

  it("omits past reminder windows when rescheduling near start time", () => {
    const nearStart = new Date("2026-05-27T12:45:00.000Z");
    const rows = buildReminderRows("appt-1", nearStart, now);
    expect(rows.map((r) => r.type)).toEqual([DiscoveryReminderType.CONFIRMATION]);
  });
});
