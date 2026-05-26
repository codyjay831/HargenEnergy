import { createHmac, timingSafeEqual } from "node:crypto";

function getSigningKey(): string {
  const key =
    process.env.FIELD_ENCRYPTION_KEY?.trim() ||
    process.env.AUTH_SECRET?.trim() ||
    process.env.NEXTAUTH_SECRET?.trim();
  if (!key) {
    if (process.env.NODE_ENV === "production") {
      throw new Error("Calendar signing key is not configured.");
    }
    return "dev-discovery-calendar-signing-key";
  }
  return key;
}

export function signDiscoveryAppointmentCalendar(appointmentId: string): string {
  return createHmac("sha256", getSigningKey())
    .update(`discovery-calendar:${appointmentId}`)
    .digest("base64url");
}

export function verifyDiscoveryAppointmentCalendar(
  appointmentId: string,
  signature: string,
): boolean {
  const expected = signDiscoveryAppointmentCalendar(appointmentId);
  if (expected.length !== signature.length) {
    return false;
  }
  try {
    return timingSafeEqual(Buffer.from(expected), Buffer.from(signature));
  } catch {
    return false;
  }
}
