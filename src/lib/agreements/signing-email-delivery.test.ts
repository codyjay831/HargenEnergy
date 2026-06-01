import { describe, expect, it } from "vitest";
import {
  buildPersistenceFailureMessage,
  buildProviderFailureMessage,
  decideSigningEmailDispatch,
} from "@/lib/agreements/signing-email-delivery";

describe("agreement signing email delivery decisions", () => {
  it("treats first-time send as sent_via_email", () => {
    const decision = decideSigningEmailDispatch({
      resendAttempt: false,
      hadPriorSentAt: false,
    });

    expect(decision).toEqual({
      eventType: "packet.sent_via_email",
      auditAction: "agreement_packet.signing_link_sent",
      label: "Sent via app email",
      resend: false,
    });
  });

  it("treats resend with prior sentAt as true resend", () => {
    const decision = decideSigningEmailDispatch({
      resendAttempt: true,
      hadPriorSentAt: true,
    });

    expect(decision).toEqual({
      eventType: "signing_link.email_resent",
      auditAction: "agreement_packet.signing_link_resent",
      label: "Signing link email resent",
      resend: true,
    });
  });

  it("treats resend without prior sentAt as first send", () => {
    const decision = decideSigningEmailDispatch({
      resendAttempt: true,
      hadPriorSentAt: false,
    });

    expect(decision).toEqual({
      eventType: "packet.sent_via_email",
      auditAction: "agreement_packet.signing_link_sent",
      label: "Sent via app email",
      resend: false,
    });
  });

  it("builds provider failure message with manual fallback", () => {
    const message = buildProviderFailureMessage("Failed to send email.");
    expect(message).toContain("Failed to send email.");
    expect(message).toContain("Signing URL is available to copy manually.");
  });

  it("builds persistence failure recovery message", () => {
    const message = buildPersistenceFailureMessage();
    expect(message).toContain("Email may have been delivered");
    expect(message).toContain("copy the signing URL");
  });
});
