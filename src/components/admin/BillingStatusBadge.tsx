import { Badge } from "@/components/ui/badge";
import { BillingMode, EngagementType } from "@/generated/prisma/client";
import {
  getBillingBadgeVariant,
  getClientBillingReadiness,
} from "@/lib/client-billing-readiness";

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

  return (
    <Badge variant={getBillingBadgeVariant(billing)}>{billing.statusLabel}</Badge>
  );
}
