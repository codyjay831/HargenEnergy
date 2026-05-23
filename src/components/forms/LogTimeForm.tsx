"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { BILLABLE_TYPES, type BillableTypeValue } from "@/lib/ui-enums";
import { createTimeEntry } from "@/app/actions/time";
import { EngagementType } from "@/generated/prisma/client";
import { Loader2 } from "lucide-react";

interface LogTimeFormProps {
  clientId: string;
  supportRequestId?: string;
  engagementType?: EngagementType;
  requestPricingComplete?: boolean;
  isOverflowApproved?: boolean;
  defaultBillableType?: BillableTypeValue;
  onSuccess?: () => void;
}

function defaultBillableForEngagement(
  engagementType: EngagementType,
  requestPricingComplete: boolean | undefined,
  explicitDefault: BillableTypeValue | undefined,
): BillableTypeValue {
  if (explicitDefault) {
    return explicitDefault;
  }
  if (engagementType === EngagementType.REQUEST_BASED && requestPricingComplete === false) {
    return BILLABLE_TYPES.NON_BILLABLE;
  }
  return BILLABLE_TYPES.INCLUDED;
}

export function LogTimeForm({
  clientId,
  supportRequestId,
  engagementType = EngagementType.SUPPORT_BLOCK,
  requestPricingComplete,
  isOverflowApproved,
  defaultBillableType,
  onSuccess,
}: LogTimeFormProps) {
  const isRequestBased = engagementType === EngagementType.REQUEST_BASED;
  const [isLoading, setIsLoading] = useState(false);
  const [date, setDate] = useState(new Date().toISOString().split("T")[0]);
  const [minutes, setMinutes] = useState("");
  const [description, setDescription] = useState("");
  const [billableType, setBillableType] = useState<BillableTypeValue>(() =>
    defaultBillableForEngagement(engagementType, requestPricingComplete, defaultBillableType),
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const result = await createTimeEntry({
        clientId,
        supportRequestId,
        date: new Date(date),
        minutes: parseInt(minutes),
        description,
        billableType,
      });

      if ("success" in result && result.success) {
        setMinutes("");
        setDescription("");
        if (onSuccess) onSuccess();
      } else {
        alert("error" in result ? result.error : "Failed to log time.");
      }
    } catch {
      alert("An unexpected error occurred.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="date">Date</Label>
          <Input
            id="date"
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            required
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="minutes">Minutes</Label>
          <Input
            id="minutes"
            type="number"
            placeholder="e.g. 30"
            value={minutes}
            onChange={(e) => setMinutes(e.target.value)}
            required
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="billableType">Billable Type</Label>
        <Select
          value={billableType}
          onValueChange={(v) => setBillableType(v as BillableTypeValue)}
        >
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={BILLABLE_TYPES.INCLUDED}>
              {isRequestBased ? "Billable" : "Included in support block"}
            </SelectItem>
            {!isRequestBased && (
              <SelectItem value={BILLABLE_TYPES.OVERFLOW}>Overflow</SelectItem>
            )}
            <SelectItem value={BILLABLE_TYPES.NON_BILLABLE}>Non-billable</SelectItem>
          </SelectContent>
        </Select>
        {!isRequestBased &&
          billableType === BILLABLE_TYPES.OVERFLOW &&
          !isOverflowApproved && (
            <p className="text-[10px] text-orange-600 font-medium italic">
              Note: Overflow has not been explicitly approved for this request.
            </p>
          )}
        {isRequestBased && requestPricingComplete === false && (
          <p className="text-[10px] text-muted-foreground italic">
            Set handoff tier and pricing before logging billable time on this request.
          </p>
        )}
      </div>

      <div className="space-y-2">
        <Label htmlFor="description">Description</Label>
        <Textarea
          id="description"
          placeholder="What work was performed?"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          required
        />
      </div>

      <Button type="submit" className="w-full" disabled={isLoading}>
        {isLoading ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Logging Time...
          </>
        ) : (
          "Log Time"
        )}
      </Button>
    </form>
  );
}
