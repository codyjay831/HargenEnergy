"use client";

import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { PortalBillingPortalButton } from "@/components/forms/PortalBillingPortalButton";
import { BillingMode } from "@/generated/prisma/client";
import type { ClientSetupReadiness } from "@/lib/client-setup-readiness";
import {
  getBillingBadgeVariant,
  getClientBillingReadiness,
} from "@/lib/client-billing-readiness";
import { PRODUCT_LANGUAGE } from "@/lib/product-language";
import type { ClientPortalSupportSetup } from "@/lib/portal-support";
import type { ClientDiscoveryRequest } from "@/lib/portal-discovery";
import {
  flattenApprovedTaskIds,
  discoveryScopeMatchesApproved,
} from "@/lib/portal-discovery-utils";
import { cn } from "@/lib/utils";
import { useSetupGuide } from "./SetupGuideProvider";

export type PortalSetupSheetPanelsProps = {
  readiness: ClientSetupReadiness;
  setup?: ClientPortalSupportSetup | null;
  discovery?: ClientDiscoveryRequest | null;
};

export function PortalSetupSheetPanels({
  readiness,
  setup,
  discovery,
}: PortalSetupSheetPanelsProps) {
  const { activeSheet } = useSetupGuide();
  if (!activeSheet) return null;

  const billing = getClientBillingReadiness({
    engagementType: readiness.engagementType,
    billingMode: setup?.billingMode ?? readiness.billing.billingMode,
    billingOverrideReason: setup?.billingOverrideReason,
    billingOverrideExpiresAt: setup?.billingOverrideExpiresAt,
    billingOverrideCreatedAt: setup?.billingOverrideCreatedAt,
    billingOverrideCreatedById: setup?.billingOverrideCreatedById,
    stripeCustomerId: setup?.stripeCustomerId,
    stripeSubscriptionId: setup?.stripeSubscriptionId,
    subscriptionStatus: setup?.subscriptionStatus,
  });

  switch (activeSheet) {
    case "portal-account":
      return (
        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">
            {readiness.portalAccessReady
              ? "Your portal access is active. Manage your profile and password on the account page."
              : "Hargen is preparing your portal invite. You will receive an email when access is ready."}
          </p>
          <Link href="/portal/account" className={cn(buttonVariants({ variant: "outline" }))}>
            Open account settings
          </Link>
        </div>
      );

    case "billing":
      return (
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <Badge variant={getBillingBadgeVariant(billing)}>{billing.customerStatusLabel}</Badge>
          </div>
          <p className="text-sm text-muted-foreground">{billing.customerDescription}</p>
          {billing.billingMode === BillingMode.STRIPE && billing.status !== "healthy" && (
            <PortalBillingPortalButton />
          )}
          <Link href="/portal/account" className="text-sm font-medium text-sky-700 underline-offset-4 hover:underline">
            View full account details
          </Link>
        </div>
      );

    case "system-access":
      return (
        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">{readiness.systemAccess.description}</p>
          <Link
            href="/portal/access"
            className={cn(buttonVariants({ variant: "default" }), "inline-flex items-center gap-2")}
          >
            {readiness.systemAccess.ready ? "Review system access" : "Provide system access"}
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      );

    case "support-areas":
      if (!setup) {
        return (
          <p className="text-sm text-muted-foreground">
            Support area details are available on your{" "}
            <Link href="/portal/account" className="font-medium text-sky-700 underline-offset-4 hover:underline">
              account page
            </Link>
            .
          </p>
        );
      }
      return <SupportAreasPanel setup={setup} discovery={discovery} />;

    case "send-work":
      return (
        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">
            {readiness.canSubmitPortalWork
              ? "You can submit work requests whenever you are ready."
              : "Send work is blocked until Hargen completes your setup."}
          </p>
          <Link
            href="/portal/requests/new"
            className={cn(
              buttonVariants({ variant: "default" }),
              !readiness.canSubmitPortalWork && "pointer-events-none opacity-50",
            )}
            aria-disabled={!readiness.canSubmitPortalWork}
          >
            {PRODUCT_LANGUAGE.workRequest.action}
          </Link>
        </div>
      );

    default:
      return null;
  }
}

function SupportAreasPanel({
  setup,
  discovery,
}: {
  setup: ClientPortalSupportSetup;
  discovery?: ClientDiscoveryRequest | null;
}) {
  const copy = PRODUCT_LANGUAGE.supportSetup;
  const approvedTaskIds = flattenApprovedTaskIds(setup.supportAreas);
  const scopeMatches =
    !discovery || discoveryScopeMatchesApproved(discovery.taskIds, approvedTaskIds);

  return (
    <div className="space-y-6">
      {discovery && discovery.tasks.length > 0 && (
        <div className="space-y-3">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            {copy.requestedAreasTitle}
          </p>
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
      )}

      <div className="space-y-3">
        <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          {copy.approvedAreasTitle}
        </p>
        {setup.supportAreas.length === 0 ? (
          <p className="text-sm text-muted-foreground">{copy.noApprovedAreas}</p>
        ) : (
          <div className="space-y-3">
            {setup.supportAreas.map((area) => (
              <div key={area.categoryName}>
                <p className="text-sm font-medium">{area.categoryName}</p>
                <ul className="mt-1 list-disc pl-5 space-y-1">
                  {area.tasks.map((task) => (
                    <li key={task.id} className="text-sm text-muted-foreground">
                      {task.name}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        )}
      </div>

      {discovery && !scopeMatches && (
        <p className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900">
          {copy.scopeDiffNotice}
        </p>
      )}
    </div>
  );
}
