/**
 * OnboardingSteps Component
 *
 * Reusable 4-step onboarding workflow:
 * 1. Qualify (linked walkthrough)
 * 2. Activate client
 * 3. Set up billing (Support Block) or pricing model (Request-Based Work)
 * 4. Send portal access
 */

"use client";

import { useRouter } from "next/navigation";
import { Check, Circle, Link as LinkIcon, Building2, CreditCard, Mail } from "lucide-react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ClientStatus, RequestStatus } from "@/lib/enums";
import { ClientPlanType } from "@/lib/billing-options";
import { ActivateClientButton } from "@/components/forms/ActivateClientButton";
import { ClientBillingManager } from "@/components/forms/ClientBillingManager";
import { ClientPortalAccessManager } from "@/components/forms/ClientPortalAccessManager";
import { getQualificationStatusLabel } from "@/lib/request-lifecycle";
import { cn } from "@/lib/utils";
import { EngagementType } from "@/generated/prisma/client";

interface OnboardingStepsProps {
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
  latestWalkthroughRequest?: {
    id: string;
    title: string;
    status: RequestStatus;
    createdAt: Date;
  } | null;
}

interface Step {
  number: number;
  title: string;
  description: string;
  icon: React.ReactNode;
  status: "complete" | "current" | "upcoming";
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
  const hasPortalAccess = client.users.length > 0;
  const billingStepComplete = isRequestBased
    ? true
    : Boolean(client.subscriptionStatus);

  const handleOpenWalkthrough = () => {
    const url = new URL(window.location.href);
    url.searchParams.set("open", "walkthrough");
    router.push(url.pathname + url.search);
  };

  const steps: Step[] = [
    {
      number: 1,
      title: "Qualify",
      description: latestWalkthroughRequest
        ? getQualificationStatusLabel(latestWalkthroughRequest.status)
        : "No walkthrough request yet",
      icon: <LinkIcon className="h-5 w-5" />,
      status: latestWalkthroughRequest ? "complete" : "current",
    },
    {
      number: 2,
      title: "Activate Client",
      description: isActive
        ? "Client is active"
        : "Mark active after walkthrough, contract, and payment",
      icon: <Building2 className="h-5 w-5" />,
      status: isActive ? "complete" : latestWalkthroughRequest ? "current" : "upcoming",
    },
    {
      number: 3,
      title: isRequestBased ? "Pricing model" : "Set up billing",
      description: isRequestBased
        ? "Pricing is handled per request after review"
        : billingStepComplete
          ? "Billing configured"
          : "Configure plan and Stripe subscription",
      icon: <CreditCard className="h-5 w-5" />,
      status: billingStepComplete ? "complete" : isActive ? "current" : "upcoming",
    },
    {
      number: 4,
      title: "Send portal access",
      description: hasPortalAccess
        ? `${client.users.length} user(s) invited`
        : "Send portal invite after activation",
      icon: <Mail className="h-5 w-5" />,
      status: hasPortalAccess
        ? "complete"
        : isActive && billingStepComplete
          ? "current"
          : "upcoming",
    },
  ];

  return (
    <Card className="border-primary/20">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>Onboarding Progress</CardTitle>
          <Badge variant={isActive ? "default" : "secondary"}>
            {isActive ? "Active" : "Prospect"}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-6">
          {steps.map((step, index) => (
            <div key={step.number} className="relative flex gap-4">
              {index < steps.length - 1 && (
                <div className="absolute left-[19px] top-[40px] h-[calc(100%+8px)] w-0.5 bg-border" />
              )}

              <div
                className={cn(
                  "relative z-10 flex h-10 w-10 shrink-0 items-center justify-center rounded-full border-2",
                  step.status === "complete"
                    ? "border-primary bg-primary text-primary-foreground"
                    : step.status === "current"
                      ? "border-primary bg-background text-primary"
                      : "border-muted-foreground/30 bg-background text-muted-foreground",
                )}
              >
                {step.status === "complete" ? (
                  <Check className="h-5 w-5" />
                ) : (
                  <Circle className="h-2 w-2 fill-current" />
                )}
              </div>

              <div className="flex-1 pt-1">
                <div className="flex items-center justify-between mb-1">
                  <h4 className="text-sm font-semibold">{step.title}</h4>
                  {step.status === "upcoming" && (
                    <Badge variant="outline" className="text-[10px] px-1 py-0 h-4">
                      Locked
                    </Badge>
                  )}
                </div>
                <p className="text-xs text-muted-foreground mb-3">{step.description}</p>

                {step.number === 1 && latestWalkthroughRequest && (
                  <Button
                    variant="link"
                    size="sm"
                    onClick={handleOpenWalkthrough}
                    className="h-auto p-0 text-xs font-medium"
                  >
                    Review walkthrough →
                  </Button>
                )}

                {step.number === 2 && !isActive && latestWalkthroughRequest && (
                  <ActivateClientButton clientId={client.id} />
                )}

                {step.number === 3 && isActive && !isRequestBased && (
                  <ClientBillingManager
                    clientId={client.id}
                    currentPlan={client.planType as ClientPlanType}
                    stripeCustomerId={client.stripeCustomerId ?? null}
                    subscriptionStatus={client.subscriptionStatus ?? null}
                  />
                )}

                {step.number === 3 && isActive && isRequestBased && (
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    Request-Based Work clients are priced per request after review. No
                    subscription setup is required.
                  </p>
                )}

                {step.number === 4 && (isActive || client.status === ClientStatus.LEAD) && (
                  <ClientPortalAccessManager
                    clientId={client.id}
                    clientStatus={client.status as ClientStatus}
                    defaultEmail={client.email}
                    defaultName={client.contactName}
                    users={client.users}
                  />
                )}

                {step.number === 2 && !latestWalkthroughRequest && (
                  <p className="text-xs text-muted-foreground italic">
                    Waiting for walkthrough request
                  </p>
                )}

                {step.number === 3 && !isActive && (
                  <p className="text-xs text-muted-foreground italic">Activate client first</p>
                )}

                {step.number === 4 && !isActive && (
                  <p className="text-xs text-muted-foreground italic">
                    {isRequestBased
                      ? "Complete activation first"
                      : "Complete activation and billing first"}
                  </p>
                )}
              </div>
            </div>
          ))}
        </div>

        <div className="pt-4 border-t">
          <div className="flex items-center justify-between text-xs">
            <span className="text-muted-foreground">
              {steps.filter((s) => s.status === "complete").length} of {steps.length} steps
              complete
            </span>
            {isActive && hasPortalAccess && (
              <Badge variant="default" className="text-[10px]">
                Onboarding complete
              </Badge>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
