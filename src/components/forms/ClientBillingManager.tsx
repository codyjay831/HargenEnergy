"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  SUPPORT_PLANS,
  type ClientPlanType,
  type SupportPlanType,
} from "@/lib/billing-options";
import { createCheckoutSession } from "@/app/actions/stripe";
import { BillingMode, EngagementType } from "@/generated/prisma/client";
import { getClientBillingReadiness } from "@/lib/client-billing-readiness";
import { CreditCard, Loader2 } from "lucide-react";

function initialCheckoutPlan(plan: ClientPlanType): SupportPlanType {
  const match = SUPPORT_PLANS.find((p) => p.value === plan);
  return match ? match.value : "LIGHT";
}

interface ClientBillingManagerProps {
  clientId: string;
  engagementType: EngagementType;
  billingMode?: BillingMode | null;
  billingOverrideReason?: string | null;
  billingOverrideExpiresAt?: Date | null;
  billingOverrideCreatedAt?: Date | null;
  billingOverrideCreatedById?: string | null;
  currentPlan: ClientPlanType;
  subscriptionStatus: string | null;
  stripeCustomerId: string | null;
  stripeSubscriptionId?: string | null;
}

export function ClientBillingManager({
  clientId,
  engagementType,
  billingMode,
  billingOverrideReason,
  billingOverrideExpiresAt,
  billingOverrideCreatedAt,
  billingOverrideCreatedById,
  currentPlan,
  subscriptionStatus,
  stripeCustomerId,
  stripeSubscriptionId,
}: ClientBillingManagerProps) {
  const [plan, setPlan] = useState<SupportPlanType>(() =>
    initialCheckoutPlan(currentPlan)
  );
  const [isLoading, setIsLoading] = useState(false);

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
  });

  const handleCreateCheckout = async () => {
    setIsLoading(true);
    try {
      const result = await createCheckoutSession(clientId, plan);
      if (result.url) {
        window.location.href = result.url;
      }
    } catch (error: unknown) {
      const message =
        error instanceof Error ? error.message : "Failed to create checkout session.";
      alert(message);
    } finally {
      setIsLoading(false);
    }
  };

  // Preserve existing checkout lock semantics (active subscription only).
  const checkoutLocked = subscriptionStatus === "active";

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <label className="text-sm font-medium">Support Block / Plan</label>
        <Select
          value={plan}
          onValueChange={(v) => setPlan(v as SupportPlanType)}
          disabled={checkoutLocked || isLoading}
        >
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {SUPPORT_PLANS.map((p) => (
              <SelectItem key={p.value} value={p.value}>
                {p.label} ({p.weeklyHours} hrs/wk)
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {!checkoutLocked ? (
        <>
          <Button className="w-full" onClick={handleCreateCheckout} disabled={isLoading}>
            {isLoading ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <CreditCard className="mr-2 h-4 w-4" />
            )}
            Create Checkout Session
          </Button>
          {billing.status === "configured" && (
            <p className="text-xs text-muted-foreground">{billing.description}</p>
          )}
        </>
      ) : (
        <div className="p-4 bg-green-50 border border-green-200 rounded-md">
          <p className="text-sm text-green-800 font-medium flex items-center">
            <span className="h-2 w-2 bg-green-500 rounded-full mr-2" />
            {billing.statusLabel}
          </p>
          <p className="text-xs text-green-600 mt-1">Plan: {currentPlan}</p>
          <p className="text-xs text-green-700/80 mt-2">{billing.description}</p>
        </div>
      )}

      {!checkoutLocked && billing.status === "attention" && (
        <div className="p-4 bg-amber-50 border border-amber-200 rounded-md">
          <p className="text-sm text-amber-900 font-medium">{billing.statusLabel}</p>
          <p className="text-xs text-amber-800 mt-1">{billing.description}</p>
        </div>
      )}

      {stripeCustomerId && (
        <p className="text-xs text-muted-foreground text-center">
          Stripe Customer: {stripeCustomerId}
        </p>
      )}
    </div>
  );
}
