import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

const mockDelete = vi.fn();
const mockPatch = vi.fn();

vi.mock("@/lib/google-calendar/client", () => ({
  getGoogleCalendarClient: vi.fn(async () => ({
    events: {
      delete: (...args: unknown[]) => mockDelete(...args),
      patch: (...args: unknown[]) => mockPatch(...args),
    },
  })),
}));

const {
  cancelDiscoveryCalendarEvent,
  updateDiscoveryCalendarEvent,
  GoogleCalendarEventNotFoundError,
} = await import("@/lib/google-calendar/events");

describe("google calendar events", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("treats delete 404 as idempotent success", async () => {
    mockDelete.mockRejectedValueOnce({ response: { status: 404 } });

    await expect(
      cancelDiscoveryCalendarEvent({
        connectionId: "conn-1",
        calendarId: "calendar-1",
        eventId: "event-1",
      }),
    ).resolves.toBeUndefined();
  });

  it("throws typed not-found error when patch gets 404", async () => {
    mockPatch.mockRejectedValueOnce({ response: { status: 404 } });

    await expect(
      updateDiscoveryCalendarEvent({
        connectionId: "conn-1",
        calendarId: "calendar-1",
        eventId: "event-1",
        startUtc: new Date("2026-05-28T16:00:00.000Z"),
        endUtc: new Date("2026-05-28T16:45:00.000Z"),
        timezone: "America/Los_Angeles",
      }),
    ).rejects.toBeInstanceOf(GoogleCalendarEventNotFoundError);
  });
});
