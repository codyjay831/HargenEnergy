import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CreditCard } from "lucide-react";
import { PortalBillingPortalButton } from "@/components/forms/PortalBillingPortalButton";
import { PRODUCT_LANGUAGE } from "@/lib/product-language";
import { BillingMode } from "@/generated/prisma/client";
import type { ClientPortalSupportSetup } from "@/lib/portal-support";
import type { ClientWalkthroughRequest } from "@/lib/portal-walkthrough";
import {
  flattenApprovedTaskIds,
  walkthroughScopeMatchesApproved,
} from "@/lib/portal-walkthrough-utils";
import {
  getBillingBadgeVariant,
  getClientBillingReadiness,
} from "@/lib/client-billing-readiness";

interface PortalSupportSetupCardProps {
  setup: ClientPortalSupportSetup;
  walkthrough?: ClientWalkthroughRequest | null;
}

function RequestedAreasList({
  walkthrough,
}: {
  walkthrough: ClientWalkthroughRequest;
}) {
  const copy = PRODUCT_LANGUAGE.supportSetup;

  return (
    <div className="space-y-3">
      <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
        {copy.requestedAreasTitle}
      </span>
      <div className="space-y-2">
        {walkthrough.tasks.map((task) => (
          <div key={task.id} className="rounded-md border bg-muted/20 px-3 py-2">
            <p className="text-sm font-medium">{task.name}</p>
            {task.description ? (
              <p className="mt-1 text-xs text-muted-foreground">{task.description}</p>
            ) : null}
          </div>
        ))}
      </div>
    </div>
  );
}

export function PortalSupportSetupCard({
  setup,
  walkthrough,
}: PortalSupportSetupCardProps) {
  const copy = PRODUCT_LANGUAGE.supportSetup;
  const billing = getClientBillingReadiness({
    engagementType: setup.engagementType,
    billingMode: setup.billingMode,
    billingOverrideReason: setup.billingOverrideReason,
    billingOverrideExpiresAt: setup.billingOverrideExpiresAt,
    billingOverrideCreatedAt: setup.billingOverrideCreatedAt,
    billingOverrideCreatedById: setup.billingOverrideCreatedById,
    stripeCustomerId: setup.stripeCustomerId,
    stripeSubscriptionId: setup.stripeSubscriptionId,
    subscriptionStatus: setup.subscriptionStatus,
  });

  const approvedTaskIds = flattenApprovedTaskIds(setup.supportAreas);
  const scopeMatches =
    !walkthrough ||
    walkthroughScopeMatchesApproved(walkthrough.taskIds, approvedTaskIds);

  return (
    <Card id="support-setup">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <CreditCard className="h-5 w-5 text-primary" />
          {copy.title}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="flex flex-col gap-1">
          <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
            Engagement model
          </span>
          <span className="text-sm font-medium">{setup.engagementLabel}</span>
        </div>

        {walkthrough && <RequestedAreasList walkthrough={walkthrough} />}

        {setup.isRequestBased ? (
          <p className="text-sm text-muted-foreground leading-relaxed">
            {copy.requestBasedExplainer}
          </p>
        ) : (
          <>
            <div className="flex items-center justify-between">
              <div className="flex flex-col">
                <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  Current block
                </span>
                <span className="text-lg font-bold">{setup.planType} Support Block</span>
              </div>
              <Badge variant={getBillingBadgeVariant(billing)}>
                {billing.customerStatusLabel}
              </Badge>
            </div>

            <p className="text-xs text-muted-foreground">{billing.customerDescription}</p>

            <div className="flex flex-col">
              <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                Weekly reserved hours
              </span>
              <span className="text-sm font-medium">{setup.weeklyHours} hours per week</span>
            </div>

            <div className="space-y-3">
              <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                {copy.approvedAreasTitle}
              </span>
              {setup.supportAreas.length === 0 ? (
                <p className="text-sm text-muted-foreground">{copy.noApprovedAreas}</p>
              ) : (
                <div className="space-y-4">
                  {setup.supportAreas.map((area) => (
                    <div key={area.categoryName}>
                      <p className="text-sm font-semibold">{area.categoryName}</p>
                      <ul className="mt-1 list-disc pl-5 text-sm text-muted-foreground space-y-1">
                        {area.tasks.map((task) => (
                          <li key={task.id}>{task.name}</li>
                        ))}
                      </ul>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {walkthrough && !scopeMatches && (
              <p className="text-xs text-sky-800 bg-sky-50 border border-sky-200 rounded-md p-3 leading-relaxed">
                {copy.scopeDiffNotice}
              </p>
            )}

            {setup.billingMode === BillingMode.STRIPE &&
              (setup.stripeCustomerId ? (
                <PortalBillingPortalButton />
              ) : (
                <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
                  <p className="text-xs leading-relaxed text-slate-600">
                    Retainer billing will appear here after your account manager enables Stripe
                    billing.
                  </p>
                </div>
              ))}
          </>
        )}

        <p className="text-xs text-muted-foreground leading-relaxed border-t pt-4">
          {copy.changeScopePrompt}
        </p>
      </CardContent>
    </Card>
  );
}
