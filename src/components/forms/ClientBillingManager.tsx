"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { format } from "date-fns";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
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
import { updateClientBillingMode } from "@/app/actions/clients";
import { BillingMode, EngagementType } from "@/generated/prisma/client";
import { getClientBillingReadiness } from "@/lib/client-billing-readiness";
import {
  BILLING_MODE_ADMIN_LABELS,
  getAdminBillingModeHeadline,
  getAdminStripeInformationalNote,
  hasStoredStripeBillingData,
} from "@/lib/client-billing-mode";
import { cn } from "@/lib/utils";
import { CreditCard, Loader2 } from "lucide-react";
import { toast } from "sonner";

function initialCheckoutPlan(plan: ClientPlanType): SupportPlanType {
  const match = SUPPORT_PLANS.find((p) => p.value === plan);
  return match ? match.value : "LIGHT";
}

function formatDateInputValue(value?: Date | null): string {
  if (!value) return "";
  return format(new Date(value), "yyyy-MM-dd");
}

interface ClientBillingManagerProps {
  clientId: string;
  engagementType: EngagementType;
  billingMode?: BillingMode | null;
  billingOverrideReason?: string | null;
  billingOverrideExpiresAt?: Date | null;
  billingOverrideCreatedAt?: Date | null;
  billingOverrideCreatedById?: string | null;
  billingOverrideCreatedByName?: string | null;
  billingOverrideCreatedByEmail?: string | null;
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
  billingOverrideCreatedByName,
  billingOverrideCreatedByEmail,
  currentPlan,
  subscriptionStatus,
  stripeCustomerId,
  stripeSubscriptionId,
}: ClientBillingManagerProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [plan, setPlan] = useState<SupportPlanType>(() =>
    initialCheckoutPlan(currentPlan),
  );
  const [isCheckoutLoading, setIsCheckoutLoading] = useState(false);

  const currentMode = billingMode ?? BillingMode.STRIPE;
  const [selectedMode, setSelectedMode] = useState<BillingMode>(currentMode);
  const [reason, setReason] = useState(billingOverrideReason ?? "");
  const [expiresAt, setExpiresAt] = useState(
    formatDateInputValue(billingOverrideExpiresAt),
  );

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

  const isStripeAuthoritative = billing.billingMode === BillingMode.STRIPE;
  const checkoutLocked = isStripeAuthoritative && subscriptionStatus === "active";
  const hasStripeData = hasStoredStripeBillingData(billing);
  const modeHeadline = getAdminBillingModeHeadline(billing);
  const stripeInfoNote = getAdminStripeInformationalNote(billing);
  const showNonStripeFields = selectedMode !== BillingMode.STRIPE;
  const demoRequiresExpiration = selectedMode === BillingMode.DEMO;
  const createdByLabel =
    billingOverrideCreatedByName ||
    billingOverrideCreatedByEmail ||
    billingOverrideCreatedById;
  const nonStripeModeLabel = BILLING_MODE_ADMIN_LABELS[billing.billingMode];

  const handleCreateCheckout = async () => {
    setIsCheckoutLoading(true);
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
      setIsCheckoutLoading(false);
    }
  };

  const saveBillingMode = (mode: BillingMode, modeReason?: string, modeExpiresAt?: string) => {
    startTransition(async () => {
      try {
        const result = await updateClientBillingMode({
          clientId,
          billingMode: mode,
          reason: modeReason,
          expiresAt: modeExpiresAt,
        });

        if ("error" in result && result.error) {
          toast.error(result.error);
          return;
        }

        toast.success(
          mode === BillingMode.STRIPE
            ? "Returned to Stripe billing"
            : "Billing mode updated",
        );
        router.refresh();
      } catch {
        toast.error("Failed to update billing mode");
      }
    });
  };

  const handleSaveBillingMode = () => {
    saveBillingMode(selectedMode, reason, expiresAt);
  };

  const handleReturnToStripe = () => {
    saveBillingMode(BillingMode.STRIPE);
  };

  return (
    <div className="space-y-6">
      {isStripeAuthoritative ? (
        <div className="rounded-md border border-blue-200 bg-blue-50 p-4">
          <p className="text-sm font-semibold text-blue-900">{modeHeadline}</p>
          <p className="mt-1 text-xs text-blue-800">
            Subscription status and checkout below reflect live Stripe billing.
          </p>
        </div>
      ) : (
        <div
          className={cn(
            "rounded-md border p-4",
            billing.overrideExpired || billing.status === "attention"
              ? "border-amber-300 bg-amber-50"
              : "border-violet-200 bg-violet-50",
          )}
        >
          <p
            className={cn(
              "text-sm font-semibold",
              billing.overrideExpired || billing.status === "attention"
                ? "text-amber-950"
                : "text-violet-950",
            )}
          >
            {modeHeadline}
          </p>
          <p
            className={cn(
              "mt-1 text-xs",
              billing.overrideExpired || billing.status === "attention"
                ? "text-amber-900"
                : "text-violet-900",
            )}
          >
            {billing.description}
          </p>
          <div className="mt-3 space-y-1 text-xs text-slate-700">
            {billing.billingOverrideReason && (
              <p>
                <span className="font-medium">Reason:</span> {billing.billingOverrideReason}
              </p>
            )}
            {billing.billingOverrideExpiresAt && (
              <p>
                <span className="font-medium">Expires:</span>{" "}
                {format(new Date(billing.billingOverrideExpiresAt), "MMM d, yyyy")}
              </p>
            )}
            {billing.billingOverrideCreatedAt && (
              <p>
                <span className="font-medium">Set:</span>{" "}
                {format(new Date(billing.billingOverrideCreatedAt), "MMM d, yyyy 'at' h:mm a")}
                {createdByLabel ? ` by ${createdByLabel}` : ""}
              </p>
            )}
          </div>
          {stripeInfoNote && (
            <p className="mt-3 border-t border-amber-200/80 pt-3 text-xs text-amber-950/90">
              {stripeInfoNote}
            </p>
          )}
        </div>
      )}

      <div className="space-y-4 rounded-md border border-slate-200 bg-slate-50/50 p-4">
        <div>
          <h3 className="text-sm font-semibold">Billing mode controls</h3>
          <p className="mt-1 text-xs text-muted-foreground">
            Billing mode changes affect setup/readiness display only. They do not change
            portal submit or invite gates yet.
          </p>
        </div>

        <div className="space-y-3 border-t border-slate-200 pt-4">
          <div className="space-y-2">
            <Label htmlFor="billing-mode">Change billing mode</Label>
            <Select
              value={selectedMode}
              onValueChange={(value) => setSelectedMode(value as BillingMode)}
              disabled={isPending}
            >
              <SelectTrigger id="billing-mode">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={BillingMode.STRIPE}>
                  {BILLING_MODE_ADMIN_LABELS[BillingMode.STRIPE]}
                </SelectItem>
                <SelectItem value={BillingMode.MANUAL}>
                  {BILLING_MODE_ADMIN_LABELS[BillingMode.MANUAL]}
                </SelectItem>
                <SelectItem value={BillingMode.COMPED_INTERNAL}>
                  {BILLING_MODE_ADMIN_LABELS[BillingMode.COMPED_INTERNAL]}
                </SelectItem>
                <SelectItem value={BillingMode.DEMO}>
                  {BILLING_MODE_ADMIN_LABELS[BillingMode.DEMO]}
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          {showNonStripeFields && (
            <>
              <div className="space-y-2">
                <Label htmlFor="billing-override-reason">Reason</Label>
                <Textarea
                  id="billing-override-reason"
                  value={reason}
                  onChange={(event) => setReason(event.target.value)}
                  placeholder="Why is this billing mode being applied?"
                  rows={3}
                  disabled={isPending}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="billing-override-expires">
                  Expiration date
                  {demoRequiresExpiration ? "" : " (optional)"}
                </Label>
                <Input
                  id="billing-override-expires"
                  type="date"
                  value={expiresAt}
                  onChange={(event) => setExpiresAt(event.target.value)}
                  disabled={isPending}
                />
              </div>
            </>
          )}

          <div className="flex flex-wrap gap-2">
            <Button onClick={handleSaveBillingMode} disabled={isPending}>
              {isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              Save billing mode
            </Button>
            {!isStripeAuthoritative && (
              <Button
                type="button"
                variant="outline"
                onClick={handleReturnToStripe}
                disabled={isPending}
              >
                Return to Stripe billing
              </Button>
            )}
          </div>
        </div>
      </div>

      {isStripeAuthoritative ? (
        <>
          <div className="space-y-2">
            <label className="text-sm font-medium">Support Block / Plan</label>
            <Select
              value={plan}
              onValueChange={(v) => setPlan(v as SupportPlanType)}
              disabled={checkoutLocked || isCheckoutLoading || isPending}
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
              <Button
                className="w-full"
                onClick={handleCreateCheckout}
                disabled={isCheckoutLoading || isPending}
              >
                {isCheckoutLoading ? (
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
            <div className="rounded-md border border-green-200 bg-green-50 p-4">
              <p className="flex items-center text-sm font-medium text-green-800">
                <span className="mr-2 h-2 w-2 rounded-full bg-green-500" />
                {billing.statusLabel}
              </p>
              <p className="mt-1 text-xs text-green-600">Plan: {currentPlan}</p>
              <p className="mt-2 text-xs text-green-700/80">{billing.description}</p>
            </div>
          )}

          {!checkoutLocked && billing.status === "attention" && (
            <div className="rounded-md border border-amber-200 bg-amber-50 p-4">
              <p className="text-sm font-medium text-amber-900">{billing.statusLabel}</p>
              <p className="mt-1 text-xs text-amber-800">{billing.description}</p>
            </div>
          )}

          {stripeCustomerId && (
            <p className="text-center text-xs text-muted-foreground">
              Stripe Customer: {stripeCustomerId}
            </p>
          )}
        </>
      ) : (
        <div className="space-y-3 rounded-md border border-dashed border-slate-300 bg-slate-50/80 p-4">
          <div>
            <h4 className="text-sm font-medium text-slate-900">Stripe tools (secondary)</h4>
            <p className="mt-1 text-xs text-muted-foreground">
              Current billing mode is {nonStripeModeLabel}. Return to Stripe billing to use
              Stripe checkout as the primary billing path.
            </p>
          </div>

          {hasStripeData && (
            <div className="space-y-1 rounded-md border border-slate-200 bg-white p-3 text-xs text-slate-700">
              <p className="font-medium text-slate-900">Stored Stripe data (informational)</p>
              {subscriptionStatus && (
                <p>
                  <span className="text-muted-foreground">Subscription status:</span>{" "}
                  {subscriptionStatus}
                </p>
              )}
              {stripeSubscriptionId && (
                <p>
                  <span className="text-muted-foreground">Subscription ID:</span>{" "}
                  {stripeSubscriptionId}
                </p>
              )}
              {stripeCustomerId && (
                <p>
                  <span className="text-muted-foreground">Customer ID:</span> {stripeCustomerId}
                </p>
              )}
              <p className="text-muted-foreground">
                Plan on file: {currentPlan}. Stripe fields are preserved but not authoritative
                while {nonStripeModeLabel.toLowerCase()} is active.
              </p>
            </div>
          )}

          <div className="space-y-2 opacity-70">
            <label className="text-sm font-medium text-muted-foreground">
              Support Block / Plan
            </label>
            <Select value={plan} disabled>
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

          <Button className="w-full" variant="outline" disabled>
            <CreditCard className="mr-2 h-4 w-4" />
            Create Checkout Session
          </Button>
          <p className="text-xs text-muted-foreground">
            Stripe tools are available if you return this client to Stripe billing.
          </p>
        </div>
      )}
    </div>
  );
}
