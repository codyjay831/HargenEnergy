"use client";

import { OnboardingSteps } from "./OnboardingSteps";
import { WalkthroughDrawer } from "./WalkthroughDrawer";
import { ClientStatus, RequestStatus } from "@/lib/enums";
import { EngagementType } from "@/generated/prisma/client";

interface OnboardingWrapperProps {
  client: {
    id: string;
    companyName: string;
    contactName: string;
    email: string;
    status: ClientStatus;
    planType: string;
    engagementType: EngagementType;
    subscriptionStatus?: string | null;
    stripeCustomerId?: string | null;
    users: { id: string; email: string; name: string | null }[];
  };
  walkthroughPlanRequestBased?: boolean;
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
    client: {
      planType: string;
    };
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
  walkthroughPlanRequestBased,
  latestWalkthroughRequest,
}: OnboardingWrapperProps) {
  return (
    <>
      <OnboardingSteps
        client={client}
        walkthroughPlanRequestBased={walkthroughPlanRequestBased}
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
      <WalkthroughDrawer request={latestWalkthroughRequest} />
    </>
  );
}
