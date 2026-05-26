import { describe, expect, it } from "vitest";
import {
  signWalkthroughAppointmentCalendar,
  verifyWalkthroughAppointmentCalendar,
} from "@/lib/walkthrough-scheduling/calendar-signature";

describe("walkthrough calendar signature", () => {
  it("signs and verifies appointment calendar URLs", () => {
    const appointmentId = "appt_123";
    const signature = signWalkthroughAppointmentCalendar(appointmentId);

    expect(signature.length).toBeGreaterThan(10);
    expect(verifyWalkthroughAppointmentCalendar(appointmentId, signature)).toBe(true);
    expect(verifyWalkthroughAppointmentCalendar(appointmentId, "bad-signature")).toBe(false);
  });
});
