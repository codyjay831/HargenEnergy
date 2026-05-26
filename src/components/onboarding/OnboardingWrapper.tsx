"use client";

import { OnboardingSteps } from "./OnboardingSteps";
import { WalkthroughDrawer } from "./WalkthroughDrawer";
import { ClientStatus, RequestStatus } from "@/lib/enums";
import { BillingMode, EngagementType } from "@/generated/prisma/client";
import type { IntakeSnapshotClient, IntakeSnapshotMetadata } from "@/lib/intake-snapshot";

interface OnboardingWrapperProps {
  client: {
    id: string;
    companyName: string;
    contactName: string;
    email: string;
    status: ClientStatus;
    planType: string;
    engagementType: EngagementType;
    billingMode?: BillingMode | null;
    billingOverrideReason?: string | null;
    billingOverrideExpiresAt?: Date | null;
    billingOverrideCreatedAt?: Date | null;
    billingOverrideCreatedById?: string | null;
    approvedWorkTaskCount: number;
    subscriptionStatus?: string | null;
    stripeCustomerId?: string | null;
    stripeSubscriptionId?: string | null;
    users: { id: string; email: string; name: string | null }[];
  };
  intakeClient: IntakeSnapshotClient;
  walkthroughMetadata?: IntakeSnapshotMetadata | null;
  latestWalkthroughRequest: {
    id: string;
    clientId: string;
    title: string;
    supportNeeded: string | null;
    description: string;
    mostHelpful: string | null;
    urgency: string;
    status: RequestStatus;
    needsInfo: boolean;
    internalNotes: string | null;
    clientVisibleUpdate: string | null;
    estimatedMinutes: number | null;
    createdAt: Date;
    timeEntries: Array<{
      id: string;
      description: string;
      minutes: number;
      date: Date;
      billableType: string;
    }>;
  } | null;
}

export function OnboardingWrapper({
  client,
  intakeClient,
  walkthroughMetadata,
  latestWalkthroughRequest,
}: OnboardingWrapperProps) {
  return (
    <>
      <OnboardingSteps
        client={{
          id: client.id,
          status: client.status,
          engagementType: client.engagementType,
        }}
        latestWalkthroughRequest={
          latestWalkthroughRequest
            ? {
                id: latestWalkthroughRequest.id,
                title: latestWalkthroughRequest.title,
                status: latestWalkthroughRequest.status,
                createdAt: latestWalkthroughRequest.createdAt,
              }
            : null
        }
      />
      <WalkthroughDrawer
        client={intakeClient}
        request={latestWalkthroughRequest}
        metadata={walkthroughMetadata}
      />
    </>
  );
}
