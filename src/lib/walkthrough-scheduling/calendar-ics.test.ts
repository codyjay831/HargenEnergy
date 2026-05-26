import { describe, expect, it } from "vitest";
import {
  buildGoogleCalendarUrl,
  buildWalkthroughEventSummary,
  buildWalkthroughIcs,
  walkthroughEventUid,
} from "@/lib/walkthrough-scheduling/calendar-ics";

describe("walkthrough calendar ICS", () => {
  const startUtc = new Date("2026-05-27T20:30:00.000Z");
  const endUtc = new Date("2026-05-27T21:00:00.000Z");
  const uid = walkthroughEventUid("appt_123");

  it("builds a publish ICS with stable UID and UTC timestamps", () => {
    const ics = buildWalkthroughIcs({
      uid,
      summary: buildWalkthroughEventSummary("Struxient"),
      description: "Walkthrough with Hargen Energy for Struxient.",
      startUtc,
      endUtc,
      location: "https://meet.google.com/abc-defg-hij",
    });

    expect(ics).toContain("METHOD:PUBLISH");
    expect(ics).toContain(`UID:${uid}`);
    expect(ics).toContain("DTSTART:20260527T203000Z");
    expect(ics).toContain("DTEND:20260527T210000Z");
    expect(ics).toContain("SUMMARY:Hargen walkthrough — Struxient");
    expect(ics).toContain("LOCATION:https://meet.google.com/abc-defg-hij");
    expect(ics).not.toContain("STATUS:CANCELLED");
  });

  it("builds a cancel ICS with the same UID and cancelled status", () => {
    const ics = buildWalkthroughIcs({
      uid,
      method: "CANCEL",
      status: "CANCELLED",
      sequence: 1,
      summary: buildWalkthroughEventSummary("Struxient"),
      description: "Walkthrough with Hargen Energy for Struxient.",
      startUtc,
      endUtc,
    });

    expect(ics).toContain("METHOD:CANCEL");
    expect(ics).toContain(`UID:${uid}`);
    expect(ics).toContain("SEQUENCE:1");
    expect(ics).toContain("STATUS:CANCELLED");
  });

  it("builds a Google Calendar template URL", () => {
    const url = buildGoogleCalendarUrl({
      summary: buildWalkthroughEventSummary("Struxient"),
      description: "Walkthrough details",
      startUtc,
      endUtc,
      location: "https://meet.google.com/abc-defg-hij",
    });

    expect(url).toContain("calendar.google.com/calendar/render");
    expect(url).toContain("action=TEMPLATE");
    expect(url).toContain("dates=20260527T203000Z%2F20260527T210000Z");
  });
});
