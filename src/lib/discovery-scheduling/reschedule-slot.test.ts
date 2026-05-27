import { beforeEach, describe, expect, it, vi } from "vitest";
import { DiscoveryAppointmentStatus } from "@/generated/prisma/client";

vi.mock("server-only", () => ({}));

const mockGetSettings = vi.fn();
const mockGetConnection = vi.fn();
const mockBuildSlotContext = vi.fn();
const mockIsSlotStillAvailable = vi.fn();
const mockBlockedRangeOverlapsAny = vi.fn();
const mockFindUnique = vi.fn();
const mockTransaction = vi.fn();
const mockUpdateEvent = vi.fn();

vi.mock("@/lib/discovery-scheduling/availability-settings", () => ({
  getDiscoveryAvailabilitySettings: () => mockGetSettings(),
}));

vi.mock("@/lib/google-calendar/token-store", () => ({
  getActiveGoogleCalendarConnection: () => mockGetConnection(),
}));

const mockBuildReminderRows = vi.fn();
const mockUpsertReminderRows = vi.fn();

vi.mock("@/lib/discovery-scheduling/book-slot", () => ({
  buildSlotGeneratorContext: (...args: unknown[]) => mockBuildSlotContext(...args),
  buildReminderRows: (...args: unknown[]) => mockBuildReminderRows(...args),
  upsertReminderRows: (...args: unknown[]) => mockUpsertReminderRows(...args),
}));

vi.mock("@/lib/discovery-scheduling/slot-generator", () => ({
  isSlotStillAvailable: (...args: unknown[]) => mockIsSlotStillAvailable(...args),
}));

vi.mock("@/lib/discovery-scheduling/overlap", () => ({
  blockedRangeOverlapsAny: (...args: unknown[]) => mockBlockedRangeOverlapsAny(...args),
}));

vi.mock("@/lib/google-calendar/events", () => ({
  updateDiscoveryCalendarEvent: (...args: unknown[]) => mockUpdateEvent(...args),
  createDiscoveryCalendarEvent: vi.fn(),
  cancelDiscoveryCalendarEvent: vi.fn(),
  GoogleCalendarEventNotFoundError: class extends Error {},
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    discoveryAppointment: {
      findUnique: (...args: unknown[]) => mockFindUnique(...args),
      update: vi.fn(),
    },
    $transaction: (...args: unknown[]) => mockTransaction(...args),
  },
}));

const { applyDiscoverySlotChange } = await import("@/lib/discovery-scheduling/reschedule-slot");

describe("applyDiscoverySlotChange", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetSettings.mockResolvedValue({
      timezone: "America/Los_Angeles",
      slotDurationMinutes: 45,
      bufferBeforeMinutes: 10,
      bufferAfterMinutes: 10,
      smsRemindersEnabled: false,
      defaultMeetingUrl: "https://meet.example.com/discovery",
    });
    mockGetConnection.mockResolvedValue({
      id: "conn-1",
      calendarId: "cal-1",
      meetCreationEnabled: true,
      meetLastSuccessAt: null,
    });
    mockBuildSlotContext.mockResolvedValue({
      slotInput: {},
      busyBlocksUtc: [],
      existingAppointments: [],
      now: new Date("2026-05-27T12:00:00.000Z"),
    });
    mockIsSlotStillAvailable.mockReturnValue(true);
    mockBlockedRangeOverlapsAny.mockReturnValue(false);
    mockFindUnique.mockResolvedValue({
      status: DiscoveryAppointmentStatus.SCHEDULED,
      googleEventId: "evt-1",
      googleCalendarId: "cal-1",
      googleEventLink: "https://calendar.google.com/event?eid=evt-1",
      meetingUrl: "https://meet.google.com/aaa-bbbb-ccc",
      meetingType: "Google Meet",
    });
    mockUpdateEvent.mockResolvedValue(undefined);
    mockBuildReminderRows.mockReturnValue([]);
  });

  it("returns refresh error when status changed before transactional update", async () => {
    mockTransaction.mockImplementationOnce(async (fn: (tx: unknown) => unknown) =>
      fn({
        discoveryAppointment: {
          findFirst: vi.fn().mockResolvedValue(null),
          updateMany: vi.fn().mockResolvedValue({ count: 0 }),
        },
      }),
    );

    const result = await applyDiscoverySlotChange({
      mode: "reschedule",
      schedulingLinkId: "link-1",
      appointmentId: "appt-1",
      slotStartUtc: new Date("2026-05-29T16:00:00.000Z"),
      companyName: "Acme Solar",
      customerContactName: "Jamie",
      customerEmail: "jamie@example.com",
      customerPhone: null,
      currentStatus: DiscoveryAppointmentStatus.SCHEDULED,
      googleEventId: "evt-1",
    });

    expect(result).toEqual({
      error: "This appointment changed while you were booking. Refresh and try again.",
    });
  });

  it("clears existing reminders before recreating to avoid unique-constraint failure", async () => {
    const reminderDeleteMany = vi.fn().mockResolvedValue({ count: 2 });

    mockTransaction.mockImplementationOnce(async (fn: (tx: unknown) => unknown) =>
      fn({
        discoveryAppointment: {
          findFirst: vi.fn().mockResolvedValue(null),
          updateMany: vi.fn().mockResolvedValue({ count: 1 }),
        },
        discoverySchedulingLink: { update: vi.fn().mockResolvedValue({}) },
        discoveryReminder: {
          deleteMany: reminderDeleteMany,
        },
        googleCalendarConnection: { update: vi.fn().mockResolvedValue({}) },
      }),
    );

    const result = await applyDiscoverySlotChange({
      mode: "reschedule",
      schedulingLinkId: "link-1",
      appointmentId: "appt-1",
      slotStartUtc: new Date("2026-05-29T16:00:00.000Z"),
      companyName: "Acme Solar",
      customerContactName: "Jamie",
      customerEmail: "jamie@example.com",
      customerPhone: null,
      currentStatus: DiscoveryAppointmentStatus.SCHEDULED,
      googleEventId: "evt-1",
    });

    expect(result).toEqual({ success: true, appointmentId: "appt-1" });
    expect(reminderDeleteMany).toHaveBeenCalledWith({
      where: { appointmentId: "appt-1" },
    });
  });

  it("upserts reminders (instead of createMany) so P2002 cannot fire on driver adapters", async () => {
    const reminderDeleteMany = vi.fn().mockResolvedValue({ count: 3 });
    const reminderRows = [
      {
        appointmentId: "appt-1",
        type: "CONFIRMATION",
        channel: "EMAIL",
        scheduledFor: new Date("2026-05-27T12:00:00.000Z"),
        status: "PENDING",
      },
      {
        appointmentId: "appt-1",
        type: "TWENTY_FOUR_HOUR",
        channel: "EMAIL",
        scheduledFor: new Date("2026-05-28T16:00:00.000Z"),
        status: "PENDING",
      },
    ];
    mockBuildReminderRows.mockReturnValue(reminderRows);
    mockUpsertReminderRows.mockResolvedValue(undefined);

    const txStub = {
      discoveryAppointment: {
        findFirst: vi.fn().mockResolvedValue(null),
        updateMany: vi.fn().mockResolvedValue({ count: 1 }),
      },
      discoverySchedulingLink: { update: vi.fn().mockResolvedValue({}) },
      discoveryReminder: {
        deleteMany: reminderDeleteMany,
      },
      googleCalendarConnection: { update: vi.fn().mockResolvedValue({}) },
    };

    mockTransaction.mockImplementationOnce(async (fn: (tx: unknown) => unknown) => fn(txStub));

    const result = await applyDiscoverySlotChange({
      mode: "reschedule",
      schedulingLinkId: "link-1",
      appointmentId: "appt-1",
      slotStartUtc: new Date("2026-05-29T16:00:00.000Z"),
      companyName: "Acme Solar",
      customerContactName: "Jamie",
      customerEmail: "jamie@example.com",
      customerPhone: null,
      currentStatus: DiscoveryAppointmentStatus.SCHEDULED,
      googleEventId: "evt-1",
    });

    expect(result).toEqual({ success: true, appointmentId: "appt-1" });
    expect(reminderDeleteMany).toHaveBeenCalledWith({
      where: { appointmentId: "appt-1" },
    });
    expect(mockUpsertReminderRows).toHaveBeenCalledWith(txStub, reminderRows);
  });
});
