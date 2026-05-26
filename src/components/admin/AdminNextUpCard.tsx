"use client";

import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  BillingMode,
  ClientStatus,
  EngagementType,
  SystemAccessStatus,
} from "@/generated/prisma/client";
import { adminClientTabHref } from "@/lib/admin-client-tabs";
import { ActivateClientButton } from "@/components/forms/ActivateClientButton";
import { isPaymentMadeForSubmit } from "@/lib/client-billing-readiness";
import { getPortalWorkSubmitEligibility } from "@/lib/portal-submit-eligibility";

type AdminNextUpCardProps = {
  clientId: string;
  clientStatus: ClientStatus;
  engagementType: EngagementType;
  billingMode: Parameters<typeof isPaymentMadeForSubmit>[0]["billingMode"];
  billingOverrideReason?: string | null;
  billingOverrideExpiresAt?: Date | null;
  billingOverrideCreatedAt?: Date | null;
  billingOverrideCreatedById?: string | null;
  stripeCustomerId?: string | null;
  stripeSubscriptionId?: string | null;
  subscriptionStatus?: string | null;
  subscriptionCurrentPeriodEnd?: Date | null;
  activeApprovedWorkTaskCount: number;
  activeCatalogTaskCount: number;
  portalUserCount: number;
  portalLoggedInCount: number;
  systemAccessPendingCount: number;
};

function statusBadge(done: boolean, label: string) {
  return (
    <Badge variant={done ? "default" : "secondary"} className="text-xs">
      {label}
    </Badge>
  );
}

export function AdminNextUpCard({
  clientId,
  clientStatus,
  engagementType,
  billingMode,
  billingOverrideReason,
  billingOverrideExpiresAt,
  billingOverrideCreatedAt,
  billingOverrideCreatedById,
  stripeCustomerId,
  stripeSubscriptionId,
  subscriptionStatus,
  subscriptionCurrentPeriodEnd,
  activeApprovedWorkTaskCount,
  activeCatalogTaskCount,
  portalUserCount,
  portalLoggedInCount,
  systemAccessPendingCount,
}: AdminNextUpCardProps) {
  const resolvedBillingMode = billingMode ?? BillingMode.STRIPE;
  const isActive = clientStatus === ClientStatus.ACTIVE;
  const isSupportBlock = engagementType === EngagementType.SUPPORT_BLOCK;
  const paymentMade = isPaymentMadeForSubmit({
    engagementType,
    billingMode: resolvedBillingMode,
    billingOverrideReason,
    billingOverrideExpiresAt,
    billingOverrideCreatedAt,
    billingOverrideCreatedById,
    stripeCustomerId,
    stripeSubscriptionId,
    subscriptionStatus,
    subscriptionCurrentPeriodEnd,
  });

  const submitEligibility = getPortalWorkSubmitEligibility({
    status: clientStatus,
    engagementType,
    billingMode: resolvedBillingMode,
    billingOverrideReason: billingOverrideReason ?? null,
    billingOverrideExpiresAt: billingOverrideExpiresAt ?? null,
    billingOverrideCreatedAt: billingOverrideCreatedAt ?? null,
    billingOverrideCreatedById: billingOverrideCreatedById ?? null,
    stripeCustomerId: stripeCustomerId ?? null,
    stripeSubscriptionId: stripeSubscriptionId ?? null,
    subscriptionStatus: subscriptionStatus ?? null,
    subscriptionCurrentPeriodEnd: subscriptionCurrentPeriodEnd ?? null,
    approvedWorkTaskCount: activeApprovedWorkTaskCount,
    activeCatalogTaskCount,
  });

  return (
    <Card className="border-sky-200/80 shadow-sm">
      <CardHeader className="pb-3">
        <CardTitle className="text-lg">Next up</CardTitle>
        <p className="text-sm text-muted-foreground">
          {isSupportBlock
            ? "Parallel setup after discovery — invite, billing, and access can happen in any order."
            : "Request-Based clients submit work after activation. Billing is per request."}
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <div className="rounded-lg border p-3 space-y-2">
            <div className="flex items-center justify-between gap-2">
              <p className="text-sm font-medium">Activate</p>
              {statusBadge(isActive, isActive ? "Active" : "Prospect")}
            </div>
            {!isActive && <ActivateClientButton clientId={clientId} />}
          </div>

          <div className="rounded-lg border p-3 space-y-2">
            <div className="flex items-center justify-between gap-2">
              <p className="text-sm font-medium">Portal invite</p>
              {statusBadge(
                portalUserCount > 0,
                portalUserCount > 0 ? "Sent" : "Not sent",
              )}
            </div>
            <Link
              href={adminClientTabHref(clientId, "billing")}
              className={cn(buttonVariants({ variant: "outline", size: "sm" }))}
            >
              Manage invite
            </Link>
          </div>

          <div className="rounded-lg border p-3 space-y-2">
            <div className="flex items-center justify-between gap-2">
              <p className="text-sm font-medium">
                {isSupportBlock ? "Billing" : "Billing model"}
              </p>
              {isSupportBlock
                ? statusBadge(paymentMade, paymentMade ? "Paid" : "Pending")
                : statusBadge(true, "Per request")}
            </div>
            <Link
              href={adminClientTabHref(clientId, "billing")}
              className={cn(buttonVariants({ variant: "outline", size: "sm" }))}
            >
              {isSupportBlock ? "Set up billing" : "View billing"}
            </Link>
          </div>

          <div className="rounded-lg border p-3 space-y-2">
            <div className="flex items-center justify-between gap-2">
              <p className="text-sm font-medium">System access</p>
              <Badge variant="outline" className="text-xs">
                Optional
              </Badge>
            </div>
            <Link
              href={adminClientTabHref(clientId, "setup")}
              className={cn(buttonVariants({ variant: "outline", size: "sm" }))}
            >
              Manage access
              {systemAccessPendingCount > 0 ? ` (${systemAccessPendingCount})` : ""}
            </Link>
          </div>
        </div>

        <div className="rounded-lg border bg-muted/30 p-3 space-y-2">
          <div className="flex flex-wrap items-center gap-2">
            <p className="text-sm font-medium">Customer can submit work</p>
            {statusBadge(
              submitEligibility.canSubmit,
              submitEligibility.canSubmit ? "Unlocked" : "Blocked",
            )}
          </div>
          {!submitEligibility.canSubmit && (
            <p className="text-sm text-muted-foreground">{submitEligibility.message}</p>
          )}
          <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
            <span>Logged in: {portalLoggedInCount > 0 ? "Yes" : "No"}</span>
            {isSupportBlock && (
              <>
                <span>Scope: {activeApprovedWorkTaskCount > 0 ? "Configured" : "Pending"}</span>
                <span>Payment: {paymentMade ? "Made" : "Pending"}</span>
              </>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export function countPendingSystemAccess(
  statuses: SystemAccessStatus[],
): number {
  return statuses.filter((s) => s === SystemAccessStatus.NOT_PROVIDED).length;
}
