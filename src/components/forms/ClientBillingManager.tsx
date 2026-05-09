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
import { CreditCard, Loader2 } from "lucide-react";

function initialCheckoutPlan(plan: ClientPlanType): SupportPlanType {
  const match = SUPPORT_PLANS.find((p) => p.value === plan);
  return match ? match.value : "LIGHT";
}

interface ClientBillingManagerProps {
  clientId: string;
  currentPlan: ClientPlanType;
  subscriptionStatus: string | null;
  stripeCustomerId: string | null;
}

export function ClientBillingManager({
  clientId,
  currentPlan,
  subscriptionStatus,
  stripeCustomerId,
}: ClientBillingManagerProps) {
  const [plan, setPlan] = useState<SupportPlanType>(() =>
    initialCheckoutPlan(currentPlan)
  );
  const [isLoading, setIsLoading] = useState(false);

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

  const isActive = subscriptionStatus === "active";

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <label className="text-sm font-medium">Support Block / Plan</label>
        <Select
          value={plan}
          onValueChange={(v) => setPlan(v as SupportPlanType)}
          disabled={isActive || isLoading}
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

      {!isActive ? (
        <Button className="w-full" onClick={handleCreateCheckout} disabled={isLoading}>
          {isLoading ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <CreditCard className="mr-2 h-4 w-4" />
          )}
          Create Checkout Session
        </Button>
      ) : (
        <div className="p-4 bg-green-50 border border-green-200 rounded-md">
          <p className="text-sm text-green-800 font-medium flex items-center">
            <span className="h-2 w-2 bg-green-500 rounded-full mr-2" />
            Active Subscription
          </p>
          <p className="text-xs text-green-600 mt-1">Plan: {currentPlan}</p>
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
