"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  HANDOFF_TIER_OPTIONS,
  PRICING_MODE_OPTIONS,
  type HandoffTierValue,
  type PricingModeValue,
} from "@/lib/ui-enums";
import { updateRequestHandoffPricing } from "@/app/actions/requests";
import { Loader2 } from "lucide-react";

interface RequestHandoffPricingFormProps {
  requestId: string;
  handoffTier: HandoffTierValue | null;
  pricingMode: PricingModeValue | null;
  flatPriceCents: number | null;
  suggestedHandoffTier?: HandoffTierValue | null;
  suggestedPricingMode?: PricingModeValue | null;
}

export function RequestHandoffPricingForm({
  requestId,
  handoffTier,
  pricingMode,
  flatPriceCents,
  suggestedHandoffTier,
  suggestedPricingMode,
}: RequestHandoffPricingFormProps) {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [tier, setTier] = useState<HandoffTierValue | "">(handoffTier ?? suggestedHandoffTier ?? "");
  const [mode, setMode] = useState<PricingModeValue | "">(pricingMode ?? suggestedPricingMode ?? "");
  const [flatDollars, setFlatDollars] = useState(
    flatPriceCents ? String(flatPriceCents / 100) : "",
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!tier || !mode) {
      alert("Select handoff tier and pricing mode.");
      return;
    }

    setIsSubmitting(true);
    const flatPriceCentsValue =
      mode === "FLAT" && flatDollars
        ? Math.round(parseFloat(flatDollars) * 100)
        : null;

    const result = await updateRequestHandoffPricing({
      requestId,
      handoffTier: tier,
      pricingMode: mode,
      flatPriceCents: flatPriceCentsValue,
    });

    setIsSubmitting(false);

    if ("error" in result && result.error) {
      alert(result.error);
    } else {
      router.refresh();
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>Handoff tier</Label>
          <Select value={tier} onValueChange={(v) => setTier(v as HandoffTierValue)}>
            <SelectTrigger>
              <SelectValue placeholder="Select tier" />
            </SelectTrigger>
            <SelectContent>
              {HANDOFF_TIER_OPTIONS.map((o) => (
                <SelectItem key={o.value} value={o.value}>
                  {o.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label>Pricing mode</Label>
          <Select value={mode} onValueChange={(v) => setMode(v as PricingModeValue)}>
            <SelectTrigger>
              <SelectValue placeholder="Select pricing" />
            </SelectTrigger>
            <SelectContent>
              {PRICING_MODE_OPTIONS.map((o) => (
                <SelectItem key={o.value} value={o.value}>
                  {o.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {mode === "FLAT" && (
        <div className="space-y-2">
          <Label htmlFor="flatDollars">Flat fee (USD)</Label>
          <Input
            id="flatDollars"
            type="number"
            min="1"
            step="1"
            placeholder="e.g. 195"
            value={flatDollars}
            onChange={(e) => setFlatDollars(e.target.value)}
            required
          />
        </div>
      )}

      <Button type="submit" className="w-full" disabled={isSubmitting}>
        {isSubmitting ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Saving...
          </>
        ) : (
          "Save handoff & pricing"
        )}
      </Button>
    </form>
  );
}
