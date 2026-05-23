/**
 * Setup action forms for prospect clients.
 * Progress is owned by ClientSetupGuide — this card exposes inline actions only.
 */

"use client";

import { useRouter } from "next/navigation";
import { Link as LinkIcon, CreditCard, Mail } from "lucide-react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ClientStatus, RequestStatus } from "@/lib/enums";
import { ClientPlanType } from "@/lib/billing-options";
import { ClientBillingManager } from "@/components/forms/ClientBillingManager";
import { ClientPortalAccessManager } from "@/components/forms/ClientPortalAccessManager";
import { getQualificationStatusLabel } from "@/lib/request-lifecycle";
import { BillingMode, EngagementType } from "@/generated/prisma/client";
import { checkPortalInviteReadinessByCount } from "@/lib/engagement";
import { getClientBillingReadiness } from "@/lib/client-billing-readiness";

interface OnboardingStepsProps {
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
  walkthroughPlanRequestBased?: boolean;
  latestWalkthroughRequest?: {
    id: string;
    title: string;
    status: RequestStatus;
    createdAt: Date;
  } | null;
}

export function OnboardingSteps({
  client,
  walkthroughPlanRequestBased,
  latestWalkthroughRequest,
}: OnboardingStepsProps) {
  const router = useRouter();
  const isActive = client.status === ClientStatus.ACTIVE;
  const isRequestBased =
    client.engagementType === EngagementType.REQUEST_BASED ||
    (walkthroughPlanRequestBased &&
      client.engagementType === EngagementType.SUPPORT_BLOCK);
  const billing = getClientBillingReadiness({
    engagementType: client.engagementType,
    billingMode: client.billingMode,
    billingOverrideReason: client.billingOverrideReason,
    billingOverrideExpiresAt: client.billingOverrideExpiresAt,
    billingOverrideCreatedAt: client.billingOverrideCreatedAt,
    billingOverrideCreatedById: client.billingOverrideCreatedById,
    stripeCustomerId: client.stripeCustomerId,
    stripeSubscriptionId: client.stripeSubscriptionId,
    subscriptionStatus: client.subscriptionStatus,
  });
  const billingStepComplete =
    billing.status === "healthy" || billing.status === "not_required";
  const scopeReadiness = checkPortalInviteReadinessByCount(
    client.engagementType,
    client.approvedWorkTaskCount,
  );
  const needsScopeBeforeInvite =
    isActive &&
    billingStepComplete &&
    !scopeReadiness.ready &&
    client.engagementType === EngagementType.SUPPORT_BLOCK;

  const handleOpenWalkthrough = () => {
    const url = new URL(window.location.href);
    url.searchParams.set("open", "walkthrough");
    router.push(url.pathname + url.search);
  };

  return (
    <Card className="border-primary/20">
      <CardHeader>
        <CardTitle>Setup actions</CardTitle>
        <p className="text-sm text-muted-foreground">
          Use Guided setup above for progress. Complete the actions below as needed.
        </p>
      </CardHeader>
      <CardContent className="space-y-8">
        <section className="space-y-3">
          <div className="flex items-center gap-2">
            <LinkIcon className="h-4 w-4 text-primary" aria-hidden />
            <h3 className="text-sm font-semibold">Qualify</h3>
          </div>
          <p className="text-sm text-muted-foreground">
            {latestWalkthroughRequest
              ? getQualificationStatusLabel(latestWalkthroughRequest.status)
              : "No walkthrough request yet."}
          </p>
          {latestWalkthroughRequest ? (
            <Button
              variant="outline"
              size="sm"
              onClick={handleOpenWalkthrough}
            >
              Review walkthrough
            </Button>
          ) : (
            <p className="text-xs text-muted-foreground italic">
              Waiting for walkthrough request.
            </p>
          )}
        </section>

        {!isActive && (
          <section className="space-y-2 rounded-md border border-dashed p-4 text-sm text-muted-foreground">
            <p>
              Activation controls are in the sidebar under{" "}
              <a href="#activation" className="font-medium text-primary underline-offset-4 hover:underline">
                Activation
              </a>
              .
            </p>
          </section>
        )}

        <section id="billing" className="scroll-mt-8 space-y-3">
          <div className="flex items-center gap-2">
            <CreditCard className="h-4 w-4 text-primary" aria-hidden />
            <h3 className="text-sm font-semibold">
              {isRequestBased ? "Pricing model" : "Set up billing"}
            </h3>
          </div>
          <p className="text-sm text-muted-foreground">{billing.description}</p>

          {isActive && !isRequestBased && (
            <ClientBillingManager
              clientId={client.id}
              engagementType={client.engagementType}
              billingMode={client.billingMode}
              billingOverrideReason={client.billingOverrideReason}
              billingOverrideExpiresAt={client.billingOverrideExpiresAt}
              billingOverrideCreatedAt={client.billingOverrideCreatedAt}
              billingOverrideCreatedById={client.billingOverrideCreatedById}
              currentPlan={client.planType as ClientPlanType}
              stripeCustomerId={client.stripeCustomerId ?? null}
              stripeSubscriptionId={client.stripeSubscriptionId ?? null}
              subscriptionStatus={client.subscriptionStatus ?? null}
            />
          )}

          {isActive && isRequestBased && (
            <p className="text-xs text-muted-foreground leading-relaxed">
              Request-Based Work clients are priced per request after review.
            </p>
          )}

          {!isActive && (
            <p className="text-xs text-muted-foreground italic">Activate the client first.</p>
          )}
        </section>

        <section id="portal-access" className="scroll-mt-8 space-y-3">
          <div className="flex items-center gap-2">
            <Mail className="h-4 w-4 text-primary" aria-hidden />
            <h3 className="text-sm font-semibold">Send portal access</h3>
          </div>
          <p className="text-sm text-muted-foreground">
            {client.users.length > 0
              ? `${client.users.length} user(s) invited.`
              : "Send a portal invite after activation and billing are ready."}
          </p>

          {(isActive || client.status === ClientStatus.LEAD) && (
            <ClientPortalAccessManager
              clientId={client.id}
              clientStatus={client.status as ClientStatus}
              engagementType={client.engagementType}
              approvedWorkTaskCount={client.approvedWorkTaskCount}
              defaultEmail={client.email}
              defaultName={client.contactName}
              users={client.users}
            />
          )}

          {needsScopeBeforeInvite && (
            <p className="text-xs text-muted-foreground italic">
              Configure approved support areas in{" "}
              <a href="#approved-work" className="font-medium text-primary underline-offset-4 hover:underline">
                Engagement & approved work
              </a>
              , then send the portal invite.
            </p>
          )}

          {!isActive && (
            <p className="text-xs text-muted-foreground italic">
              {isRequestBased
                ? "Complete activation first."
                : "Complete activation and billing first."}
            </p>
          )}
        </section>
      </CardContent>
    </Card>
  );
}
