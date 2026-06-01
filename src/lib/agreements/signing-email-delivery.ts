export type SigningEmailDispatchInput = {
  resendAttempt: boolean;
  hadPriorSentAt: boolean;
};

export type SigningEmailDispatchDecision = {
  eventType: "packet.sent_via_email" | "signing_link.email_resent";
  auditAction:
    | "agreement_packet.signing_link_sent"
    | "agreement_packet.signing_link_resent";
  label: "Sent via app email" | "Signing link email resent";
  resend: boolean;
};

export function decideSigningEmailDispatch(
  input: SigningEmailDispatchInput,
): SigningEmailDispatchDecision {
  if (input.resendAttempt && input.hadPriorSentAt) {
    return {
      eventType: "signing_link.email_resent",
      auditAction: "agreement_packet.signing_link_resent",
      label: "Signing link email resent",
      resend: true,
    };
  }

  return {
    eventType: "packet.sent_via_email",
    auditAction: "agreement_packet.signing_link_sent",
    label: "Sent via app email",
    resend: false,
  };
}

export function buildProviderFailureMessage(message: string): string {
  return `${message} Signing URL is available to copy manually.`;
}

export function buildPersistenceFailureMessage(): string {
  return "Email may have been delivered, but we could not persist send status. Please copy the signing URL below and refresh this packet before retrying.";
}
