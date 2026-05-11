import {
  BillableType,
  ClientStatus,
  SupportRequestKind,
} from "@/generated/prisma/client";

// #region agent log
fetch("http://127.0.0.1:7490/ingest/ca2f0bff-e45e-43cc-bc2f-329025fe6fd9", {
  method: "POST",
  headers: {
    "Content-Type": "application/json",
    "X-Debug-Session-Id": "501f66",
  },
  body: JSON.stringify({
    sessionId: "501f66",
    runId: "post-fix",
    hypothesisId: "H4",
    location: "request-lifecycle.ts:module-init",
    message: "request-lifecycle module initialized",
    data: {
      hasSupportRequestKind: SupportRequestKind != null,
      hasClientStatus: ClientStatus != null,
      hasBillableType: BillableType != null,
      supportRequestKindType: typeof SupportRequestKind,
    },
    timestamp: Date.now(),
  }),
}).catch(() => {});
// #endregion

export function isProspectIntake(kind: SupportRequestKind): boolean {
  return kind === SupportRequestKind.PROSPECT_INTAKE;
}

export function isClientOps(kind: SupportRequestKind): boolean {
  return kind === SupportRequestKind.CLIENT_OPS;
}

export function assertActiveClientForPortalSubmit(status: ClientStatus) {
  if (status !== ClientStatus.ACTIVE) {
    return {
      error:
        "Portal requests are available after your account is active. Contact Hargen Energy if you are still onboarding.",
    };
  }
  return null;
}

export function assertPortalInviteAllowed(status: ClientStatus) {
  if (status !== ClientStatus.ACTIVE) {
    return { error: "Activate the client before sending a portal invite." };
  }
  return null;
}

export function assertBillableTimeOnRequest(
  kind: SupportRequestKind,
  billableType: BillableType,
) {
  if (
    kind === SupportRequestKind.PROSPECT_INTAKE &&
    billableType !== BillableType.NON_BILLABLE
  ) {
    return { error: "Time on inbound leads must be logged as non-billable." };
  }
  return null;
}

export function buildIntakeTitle(supportNeeded: string[]): string {
  const summary = supportNeeded.slice(0, 2).join(", ");
  return supportNeeded.length > 2 ? `${summary}...` : summary;
}
