import { beforeEach, describe, expect, it, vi } from "vitest";
import { DiscoveryAppointmentStatus, DiscoverySchedulingLinkStatus } from "@/generated/prisma/client";

vi.mock("server-only", () => ({}));

const mockRateLimit = vi.fn();
const mockRateIdentifier = vi.fn();
const mockFindLink = vi.fn();
const mockUpdateLink = vi.fn();
const mockTransaction = vi.fn();
const mockAppointmentUpdate = vi.fn();
const mockCancelCalendarEvent = vi.fn();
const mockGetConnection = vi.fn();
const mockWriteAudit = vi.fn();
const mockRevalidateAdminClientPage = vi.fn();
const mockSendCancelEmail = vi.fn();
const mockSendCancelAdminEmail = vi.fn();

vi.mock("next/cache", () => ({
  revalidatePath: vi.fn(),
}));

vi.mock("@/lib/rate-limit", () => ({
  checkRateLimit: (...args: unknown[]) => mockRateLimit(...args),
  getRateLimitIdentifier: (...args: unknown[]) => mockRateIdentifier(...args),
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    discoverySchedulingLink: {
      findUnique: (...args: unknown[]) => mockFindLink(...args),
      update: (...args: unknown[]) => mockUpdateLink(...args),
    },
    discoveryAppointment: {
      update: (...args: unknown[]) => mockAppointmentUpdate(...args),
      findUnique: vi.fn(),
    },
    $transaction: (...args: unknown[]) => mockTransaction(...args),
  },
}));

vi.mock("@/lib/google-calendar/events", () => ({
  cancelDiscoveryCalendarEvent: (...args: unknown[]) => mockCancelCalendarEvent(...args),
}));

vi.mock("@/lib/google-calendar/token-store", () => ({
  getActiveGoogleCalendarConnection: (...args: unknown[]) => mockGetConnection(...args),
}));

vi.mock("@/lib/audit-log", () => ({
  writeAuditLog: (...args: unknown[]) => mockWriteAudit(...args),
}));

vi.mock("@/lib/revalidate-paths", () => ({
  revalidateAdminClientPage: (...args: unknown[]) => mockRevalidateAdminClientPage(...args),
}));

vi.mock("@/lib/email", () => ({
  sendDiscoveryBookingConfirmationEmail: vi.fn(),
  sendDiscoveryCancelAdminNotification: (...args: unknown[]) => mockSendCancelAdminEmail(...args),
  sendDiscoveryCancelEmail: (...args: unknown[]) => mockSendCancelEmail(...args),
  sendDiscoveryRescheduleEmail: vi.fn(),
}));

vi.mock("@/lib/discovery-scheduling/scheduling-readiness", () => ({
  getDiscoverySchedulingReadiness: vi.fn(),
}));

vi.mock("@/lib/discovery-scheduling/reschedule-slot", () => ({
  applyDiscoverySlotChange: vi.fn(),
}));

vi.mock("@/lib/discovery-scheduling/book-slot", () => ({
  bookDiscoverySlotAtomic: vi.fn(),
  loadPublicSlotOptions: vi.fn().mockResolvedValue([]),
}));

vi.mock("@/lib/discovery-scheduling/calendar-ics-server", () => ({
  buildDiscoveryCalendarArtifacts: vi.fn(),
}));

vi.mock("@/lib/app-url", () => ({
  discoveryCalendarIcsUrl: vi.fn(),
  discoverySchedulingUrl: vi.fn(),
}));

const { cancelDiscoveryAppointment } = await import("@/app/actions/discovery-scheduling-public");

const baseLink = {
  id: "link-1",
  status: DiscoverySchedulingLinkStatus.ACTIVE,
  expiresAt: new Date("2030-01-01T00:00:00.000Z"),
  clientId: "client-1",
  client: {
    companyName: "Acme Solar",
    contactName: "Jamie",
  },
  supportRequest: null,
  appointment: {
    id: "appt-1",
    status: DiscoveryAppointmentStatus.SCHEDULED,
    customerEmail: "jamie@example.com",
    customerContactName: "Jamie",
    schedulingLinkId: "link-1",
    scheduledStartUtc: new Date("2026-05-29T16:00:00.000Z"),
    scheduledEndUtc: new Date("2026-05-29T16:45:00.000Z"),
    timezone: "America/Los_Angeles",
    meetingUrl: "https://meet.google.com/aaa-bbbb-ccc",
    googleEventId: "event-1",
    googleCalendarId: "calendar-1",
  },
};

describe("cancelDiscoveryAppointment", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockRateIdentifier.mockResolvedValue("ip-1");
    mockRateLimit.mockResolvedValue({ allowed: true });
    mockFindLink.mockResolvedValue(baseLink);
    mockGetConnection.mockResolvedValue({
      id: "conn-1",
      calendarId: "calendar-1",
    });
    mockTransaction.mockImplementation(async (fn: (tx: unknown) => unknown) =>
      fn({
        discoveryAppointment: {
          updateMany: vi.fn().mockResolvedValue({ count: 1 }),
        },
        discoveryReminder: {
          updateMany: vi.fn().mockResolvedValue({ count: 1 }),
        },
      }),
    );
    mockAppointmentUpdate.mockResolvedValue({ id: "appt-1" });
    mockSendCancelEmail.mockResolvedValue({ success: true });
    mockSendCancelAdminEmail.mockResolvedValue({ success: true });
  });

  it("returns success and marks sync failed when calendar deletion throws", async () => {
    mockCancelCalendarEvent.mockRejectedValueOnce(new Error("calendar delete failed"));

    const result = await cancelDiscoveryAppointment("raw-token-1234567890");

    expect(result).toEqual({ success: true });
    expect(mockAppointmentUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          googleSyncStatus: "FAILED",
        }),
      }),
    );
  });

  it("returns success and marks sync success when calendar deletion works", async () => {
    mockCancelCalendarEvent.mockResolvedValueOnce(undefined);

    const result = await cancelDiscoveryAppointment("raw-token-1234567890");

    expect(result).toEqual({ success: true });
    expect(mockAppointmentUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          googleSyncStatus: "SYNCED",
          googleSyncError: null,
        }),
      }),
    );
    expect(mockWriteAudit).toHaveBeenCalled();
    expect(mockRevalidateAdminClientPage).toHaveBeenCalledWith("client-1");
  });
});
