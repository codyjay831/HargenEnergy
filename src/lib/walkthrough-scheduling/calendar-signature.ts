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
    return "dev-walkthrough-calendar-signing-key";
  }
  return key;
}

export function signWalkthroughAppointmentCalendar(appointmentId: string): string {
  return createHmac("sha256", getSigningKey())
    .update(`walkthrough-calendar:${appointmentId}`)
    .digest("base64url");
}

export function verifyWalkthroughAppointmentCalendar(
  appointmentId: string,
  signature: string,
): boolean {
  const expected = signWalkthroughAppointmentCalendar(appointmentId);
  if (expected.length !== signature.length) {
    return false;
  }
  try {
    return timingSafeEqual(Buffer.from(expected), Buffer.from(signature));
  } catch {
    return false;
  }
}
