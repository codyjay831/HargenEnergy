"use client";

import { DiscoveryWorkspace } from "@/components/admin/DiscoveryWorkspace";
import type { IntakeSnapshotClient, IntakeSnapshotMetadata } from "@/lib/intake-snapshot";
import type { DiscoverySchedulingReadiness } from "@/lib/discovery-scheduling/scheduling-readiness";
import { RequestStatusValue } from "@/lib/ui-enums";
import {
  DiscoveryAppointmentStatus,
  DiscoveryFitDecision,
  GoogleCalendarSyncStatus,
  DiscoverySchedulingLinkStatus,
} from "@/generated/prisma/client";

interface DiscoveryClientPanelProps {
  intakeClient: IntakeSnapshotClient;
  discoveryMetadata?: IntakeSnapshotMetadata | null;
  latestDiscoveryRequest: {
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
  schedulingReadiness: DiscoverySchedulingReadiness;
  schedulingLink: {
    status: DiscoverySchedulingLinkStatus;
    sentAt: Date | null;
    openedAt: Date | null;
    expiresAt: Date;
  } | null;
  appointment: {
    id: string;
    status: DiscoveryAppointmentStatus;
    canceledAt?: Date | null;
    scheduledStartUtc: Date;
    scheduledEndUtc: Date;
    timezone: string;
    meetingUrl: string | null;
    discoveryNotes: string | null;
    fitDecision: DiscoveryFitDecision | null;
    fitDecisionReason: string | null;
    recapContent: string | null;
    recapSentAt: Date | null;
    googleSyncStatus: GoogleCalendarSyncStatus;
    googleSyncError: string | null;
  } | null;
}

export function DiscoveryClientPanel({
  intakeClient,
  discoveryMetadata,
  latestDiscoveryRequest,
  schedulingReadiness,
  schedulingLink,
  appointment,
}: DiscoveryClientPanelProps) {
  return (
    <DiscoveryWorkspace
      client={intakeClient}
      request={{
        id: latestDiscoveryRequest.id,
        status: latestDiscoveryRequest.status,
        supportNeeded: latestDiscoveryRequest.supportNeeded,
        description: latestDiscoveryRequest.description,
        mostHelpful: latestDiscoveryRequest.mostHelpful,
        urgency: latestDiscoveryRequest.urgency,
        internalNotes: latestDiscoveryRequest.internalNotes,
        clientVisibleUpdate: latestDiscoveryRequest.clientVisibleUpdate,
        requestedTasks: latestDiscoveryRequest.requestedTasks,
      }}
      metadata={discoveryMetadata}
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
