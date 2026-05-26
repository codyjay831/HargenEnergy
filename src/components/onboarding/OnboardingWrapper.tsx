"use client";

import { WalkthroughWorkspace } from "@/components/admin/WalkthroughWorkspace";
import type { IntakeSnapshotClient, IntakeSnapshotMetadata } from "@/lib/intake-snapshot";
import type { WalkthroughSchedulingReadiness } from "@/lib/walkthrough-scheduling/scheduling-readiness";
import { RequestStatusValue } from "@/lib/ui-enums";
import {
  WalkthroughAppointmentStatus,
  WalkthroughFitDecision,
  WalkthroughSchedulingLinkStatus,
} from "@/generated/prisma/client";

interface OnboardingWrapperProps {
  intakeClient: IntakeSnapshotClient;
  walkthroughMetadata?: IntakeSnapshotMetadata | null;
  latestWalkthroughRequest: {
    id: string;
    title: string;
    supportNeeded: string | null;
    description: string;
    mostHelpful: string | null;
    urgency: string;
    status: RequestStatusValue;
    internalNotes: string | null;
    clientVisibleUpdate?: string | null;
    createdAt: Date;
    requestedTasks?: Array<{ name: string; description?: string | null }>;
  };
  schedulingReadiness: WalkthroughSchedulingReadiness;
  schedulingLink: {
    status: WalkthroughSchedulingLinkStatus;
    sentAt: Date | null;
    openedAt: Date | null;
    expiresAt: Date;
  } | null;
  appointment: {
    id: string;
    status: WalkthroughAppointmentStatus;
    canceledAt?: Date | null;
    scheduledStartUtc: Date;
    scheduledEndUtc: Date;
    timezone: string;
    meetingUrl: string | null;
    discoveryNotes: string | null;
    fitDecision: WalkthroughFitDecision | null;
    fitDecisionReason: string | null;
    recapContent: string | null;
    recapSentAt: Date | null;
  } | null;
}

export function OnboardingWrapper({
  intakeClient,
  walkthroughMetadata,
  latestWalkthroughRequest,
  schedulingReadiness,
  schedulingLink,
  appointment,
}: OnboardingWrapperProps) {
  return (
    <WalkthroughWorkspace
      client={intakeClient}
      request={{
        id: latestWalkthroughRequest.id,
        status: latestWalkthroughRequest.status,
        supportNeeded: latestWalkthroughRequest.supportNeeded,
        description: latestWalkthroughRequest.description,
        mostHelpful: latestWalkthroughRequest.mostHelpful,
        urgency: latestWalkthroughRequest.urgency,
        internalNotes: latestWalkthroughRequest.internalNotes,
        clientVisibleUpdate: latestWalkthroughRequest.clientVisibleUpdate,
        requestedTasks: latestWalkthroughRequest.requestedTasks,
      }}
      metadata={walkthroughMetadata}
      schedulingLink={
        schedulingLink
          ? {
              status: schedulingLink.status,
              sentAt: schedulingLink.sentAt,
              openedAt: schedulingLink.openedAt,
              expiresAt: schedulingLink.expiresAt,
            }
          : null
      }
      appointment={appointment}
      schedulingReadiness={schedulingReadiness}
    />
  );
}
