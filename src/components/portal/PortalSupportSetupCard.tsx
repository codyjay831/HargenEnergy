import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CreditCard } from "lucide-react";
import { PortalBillingPortalButton } from "@/components/forms/PortalBillingPortalButton";
import { PortalStartCheckoutButton } from "@/components/forms/PortalStartCheckoutButton";
import { PRODUCT_LANGUAGE } from "@/lib/product-language";
import { BillingMode } from "@/generated/prisma/client";
import type { ClientPortalSupportSetup } from "@/lib/portal-support";
import type { ClientDiscoveryRequest } from "@/lib/portal-discovery";
import {
  flattenApprovedTaskIds,
  discoveryScopeMatchesApproved,
} from "@/lib/portal-discovery-utils";
import {
  getBillingBadgeVariant,
  getClientBillingReadiness,
} from "@/lib/client-billing-readiness";

interface PortalSupportSetupCardProps {
  setup: ClientPortalSupportSetup;
  discovery?: ClientDiscoveryRequest | null;
}

function RequestedAreasList({
  discovery,
}: {
  discovery: ClientDiscoveryRequest;
}) {
  const copy = PRODUCT_LANGUAGE.supportSetup;

  return (
    <div className="space-y-3">
      <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
        {copy.requestedAreasTitle}
      </span>
      <div className="space-y-2">
        {discovery.tasks.map((task) => (
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
  discovery,
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
    !discovery ||
    discoveryScopeMatchesApproved(discovery.taskIds, approvedTaskIds);

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

        {discovery && <RequestedAreasList discovery={discovery} />}

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

            {discovery && !scopeMatches && (
              <p className="text-xs text-sky-800 bg-sky-50 border border-sky-200 rounded-md p-3 leading-relaxed">
                {copy.scopeDiffNotice}
              </p>
            )}

            {setup.billingMode === BillingMode.STRIPE &&
              (setup.stripeCustomerId ? (
                <PortalBillingPortalButton />
              ) : (
                <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
                  <p className="mb-3 text-xs leading-relaxed text-slate-600">
                    Start billing to unlock Support Block work submission.
                  </p>
                  <PortalStartCheckoutButton />
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
