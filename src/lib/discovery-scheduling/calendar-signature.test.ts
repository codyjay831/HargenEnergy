import { describe, expect, it } from "vitest";
import {
  signDiscoveryAppointmentCalendar,
  verifyDiscoveryAppointmentCalendar,
} from "@/lib/discovery-scheduling/calendar-signature";

describe("discovery calendar signature", () => {
  it("signs and verifies appointment calendar URLs", () => {
    const appointmentId = "appt_123";
    const signature = signDiscoveryAppointmentCalendar(appointmentId);

    expect(signature.length).toBeGreaterThan(10);
    expect(verifyDiscoveryAppointmentCalendar(appointmentId, signature)).toBe(true);
    expect(verifyDiscoveryAppointmentCalendar(appointmentId, "bad-signature")).toBe(false);
  });
});
