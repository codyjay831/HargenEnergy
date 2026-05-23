import { Badge } from "@/components/ui/badge";
import { BillingMode, EngagementType } from "@/generated/prisma/client";
import {
  getBillingBadgeVariant,
  getClientBillingReadiness,
} from "@/lib/client-billing-readiness";
import {
  getAdminBillingListLabel,
  hasStoredStripeBillingData,
} from "@/lib/client-billing-mode";

type BillingStatusBadgeProps = {
  engagementType: EngagementType;
  billingMode?: BillingMode | null;
  billingOverrideReason?: string | null;
  billingOverrideExpiresAt?: Date | null;
  billingOverrideCreatedAt?: Date | null;
  billingOverrideCreatedById?: string | null;
  stripeCustomerId?: string | null;
  stripeSubscriptionId?: string | null;
  subscriptionStatus?: string | null;
  subscriptionCurrentPeriodEnd?: Date | null;
};

export function BillingStatusBadge({
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
}: BillingStatusBadgeProps) {
  const billing = getClientBillingReadiness({
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
  });

  const showStripeDataNote =
    billing.billingMode !== BillingMode.STRIPE && hasStoredStripeBillingData(billing);

  return (
    <div className="flex flex-col gap-0.5">
      <Badge variant={getBillingBadgeVariant(billing)} title={billing.description}>
        {getAdminBillingListLabel(billing)}
      </Badge>
      {showStripeDataNote && (
        <span className="text-[10px] leading-tight text-muted-foreground">
          Stripe data on file
        </span>
      )}
    </div>
  );
}
