import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ActivateClientButton } from "@/components/forms/ActivateClientButton";
import { ClientBillingManager } from "@/components/forms/ClientBillingManager";
import { ClientPortalAccessManager } from "@/components/forms/ClientPortalAccessManager";
import { CreditCard, Mail } from "lucide-react";
import { format } from "date-fns";
import { EngagementType, ClientStatus } from "@/generated/prisma/client";
import type { ClientPlanType } from "@/lib/billing-options";

type ProspectAccessBillingPanelProps = {
  client: {
    id: string;
    status: ClientStatus;
    email: string;
    contactName: string;
    engagementType: EngagementType;
    billingMode: Parameters<typeof ClientBillingManager>[0]["billingMode"];
    billingOverrideReason: string | null;
    billingOverrideExpiresAt: Date | null;
    billingOverrideCreatedAt: Date | null;
    billingOverrideCreatedById: string | null;
    billingOverrideCreatedByName?: string | null;
    billingOverrideCreatedByEmail?: string | null;
    planType: ClientPlanType;
    subscriptionStatus: string | null;
    stripeCustomerId: string | null;
    stripeSubscriptionId: string | null;
    subscriptionCurrentPeriodEnd: Date | null;
    users: { id: string; email: string; name: string | null }[];
  };
  fitDecisionRecorded: boolean;
};

export function ProspectAccessBillingPanel({
  client,
  fitDecisionRecorded,
}: ProspectAccessBillingPanelProps) {
  const isRequestBased = client.engagementType === EngagementType.REQUEST_BASED;
  const approveConfirmMessage = fitDecisionRecorded
    ? undefined
    : "No fit decision has been recorded yet. Approve this company as a client anyway?";

  return (
    <div className="space-y-8 max-w-3xl">
      {client.status === ClientStatus.LEAD && (
        <Card className="border-sky-200/80 bg-sky-50/30">
          <CardHeader>
            <CardTitle className="text-base">Approve as client</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="text-sm text-muted-foreground">
              Configure billing below if needed, then approve this company as a client to send
              portal access.
            </p>
            <ActivateClientButton
              clientId={client.id}
              buttonLabel="Approve as Client"
              isLoadingLabel="Approving..."
              successMessage="Company approved as active client. Continue setup in active client view."
              confirmMessage={approveConfirmMessage}
            />
          </CardContent>
        </Card>
      )}

      <Card className="border-slate-200">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <CreditCard className="h-4 w-4 text-primary" />
            {isRequestBased ? "Billing" : "Billing & Subscription"}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isRequestBased ? (
            <p className="text-sm text-muted-foreground leading-relaxed">
              Request-Based Work clients are priced per request after review.
            </p>
          ) : (
            <>
              <ClientBillingManager
                clientId={client.id}
                engagementType={client.engagementType}
                billingMode={client.billingMode}
                billingOverrideReason={client.billingOverrideReason}
                billingOverrideExpiresAt={client.billingOverrideExpiresAt}
                billingOverrideCreatedAt={client.billingOverrideCreatedAt}
                billingOverrideCreatedById={client.billingOverrideCreatedById}
                billingOverrideCreatedByName={client.billingOverrideCreatedByName}
                billingOverrideCreatedByEmail={client.billingOverrideCreatedByEmail}
                currentPlan={client.planType}
                subscriptionStatus={client.subscriptionStatus}
                stripeCustomerId={client.stripeCustomerId}
                stripeSubscriptionId={client.stripeSubscriptionId}
              />

              {client.subscriptionCurrentPeriodEnd && (
                <div className="mt-6 pt-6 border-t text-sm">
                  <p className="text-muted-foreground flex justify-between">
                    <span>Period End:</span>
                    <span className="text-slate-900 font-medium">
                      {format(new Date(client.subscriptionCurrentPeriodEnd), "MMM d, yyyy")}
                    </span>
                  </p>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Mail className="h-4 w-4 text-primary" />
            Portal Access
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ClientPortalAccessManager
            clientId={client.id}
            clientStatus={client.status}
            defaultEmail={client.email}
            defaultName={client.contactName}
            users={client.users}
          />
        </CardContent>
      </Card>
    </div>
  );
}
