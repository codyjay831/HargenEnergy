"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select";
import { updateRequest } from "@/app/actions/requests";
import { OVERFLOW_STATUSES, type OverflowStatusValue } from "@/lib/ui-enums";
import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface OverflowPrioritizationFormProps {
  request: {
    id: string;
    overflowStatus: OverflowStatusValue;
    overflowReason: string | null;
    deferredUntil: Date | null;
    priorityRank: number | null;
  };
}

export function OverflowPrioritizationForm({ request }: OverflowPrioritizationFormProps) {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [overflowStatus, setOverflowStatus] = useState<OverflowStatusValue>(
    request.overflowStatus
  );
  const [sendOverflowEmail, setSendOverflowEmail] = useState(false);
  const [sendDeferredEmail, setSendDeferredEmail] = useState(false);
  const [sendOverageInvoice, setSendOverageInvoice] = useState(false);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsSubmitting(true);

    const formData = new FormData(e.currentTarget);
    const data = {
      overflowStatus,
      overflowReason: (formData.get("overflowReason") as string) || null,
      deferredUntil: formData.get("deferredUntil") ? new Date(formData.get("deferredUntil") as string) : null,
      priorityRank: parseInt(formData.get("priorityRank") as string) || null,
      sendOverflowEmail,
      sendDeferredEmail,
      sendOverageInvoice,
      overageInvoiceMinutes: parseInt(formData.get("overageInvoiceMinutes") as string) || null,
    };

    const result = await updateRequest(request.id, data);

    if (result.success) {
      if (result.warning) {
        alert(result.warning);
      }
      setSendOverflowEmail(false);
      setSendDeferredEmail(false);
      setSendOverageInvoice(false);
      router.refresh();
    } else {
      alert(result.error || "Failed to update overflow status.");
    }
    
    setIsSubmitting(false);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="space-y-2">
        <Label htmlFor="overflowStatus">Overflow Status</Label>
        <Select
          value={overflowStatus}
          onValueChange={(v) => setOverflowStatus(v as OverflowStatusValue)}
        >
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={OVERFLOW_STATUSES.NOT_NEEDED}>No overflow needed</SelectItem>
            <SelectItem value={OVERFLOW_STATUSES.NEEDS_APPROVAL}>
              Needs overflow approval
            </SelectItem>
            <SelectItem value={OVERFLOW_STATUSES.APPROVED}>Overflow approved</SelectItem>
            <SelectItem value={OVERFLOW_STATUSES.DECLINED}>Overflow declined</SelectItem>
            <SelectItem value={OVERFLOW_STATUSES.DEFERRED}>
              Deferred to later support block
            </SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <Label htmlFor="overflowReason">Overflow Reason / Internal Context</Label>
        <Textarea 
          id="overflowReason" 
          name="overflowReason"
          defaultValue={request.overflowReason || ""}
          placeholder="Why is overflow needed? What work is being deferred?"
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="space-y-2">
          <Label htmlFor="deferredUntil">Deferred Until (Optional)</Label>
          <Input 
            id="deferredUntil" 
            name="deferredUntil"
            type="date"
            defaultValue={request.deferredUntil ? new Date(request.deferredUntil).toISOString().split("T")[0] : ""}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="priorityRank">Priority Rank (Lower = Higher Priority)</Label>
          <Input 
            id="priorityRank" 
            name="priorityRank"
            type="number"
            defaultValue={request.priorityRank || ""}
            placeholder="e.g. 1"
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="overageInvoiceMinutes">Overage Minutes To Invoice (Optional)</Label>
        <Input
          id="overageInvoiceMinutes"
          name="overageInvoiceMinutes"
          type="number"
          min={1}
          placeholder="e.g. 120"
          disabled={overflowStatus !== OVERFLOW_STATUSES.APPROVED}
        />
      </div>

      <div className="space-y-3">
        <div className="flex items-center space-x-2 p-3 bg-orange-50 rounded-lg border border-orange-100">
          <Checkbox 
            id="sendOverflowEmail" 
            checked={sendOverflowEmail} 
            onCheckedChange={(checked) => setSendOverflowEmail(!!checked)}
            disabled={
              overflowStatus !== OVERFLOW_STATUSES.NEEDS_APPROVAL &&
              overflowStatus !== OVERFLOW_STATUSES.APPROVED
            }
          />
          <div className="grid gap-1.5 leading-none">
            <Label
              htmlFor="sendOverflowEmail"
              className={cn(
                "cursor-pointer",
                overflowStatus !== OVERFLOW_STATUSES.NEEDS_APPROVAL &&
                  overflowStatus !== OVERFLOW_STATUSES.APPROVED &&
                  "opacity-50"
              )}
            >
              Send overflow notification email
            </Label>
            <p className="text-[10px] text-muted-foreground">
              Sends approval request or approval confirmation.
            </p>
          </div>
        </div>

        <div className="flex items-center space-x-2 p-3 bg-blue-50 rounded-lg border border-blue-100">
          <Checkbox 
            id="sendDeferredEmail" 
            checked={sendDeferredEmail} 
            onCheckedChange={(checked) => setSendDeferredEmail(!!checked)}
            disabled={overflowStatus !== OVERFLOW_STATUSES.DEFERRED}
          />
          <div className="grid gap-1.5 leading-none">
            <Label
              htmlFor="sendDeferredEmail"
              className={cn(
                "cursor-pointer",
                overflowStatus !== OVERFLOW_STATUSES.DEFERRED && "opacity-50"
              )}
            >
              Send deferred update email
            </Label>
            <p className="text-[10px] text-muted-foreground">
              Notifies client that work has been deferred.
            </p>
          </div>
        </div>

        <div className="flex items-center space-x-2 p-3 bg-green-50 rounded-lg border border-green-100">
          <Checkbox
            id="sendOverageInvoice"
            checked={sendOverageInvoice}
            onCheckedChange={(checked) => setSendOverageInvoice(!!checked)}
            disabled={overflowStatus !== OVERFLOW_STATUSES.APPROVED}
          />
          <div className="grid gap-1.5 leading-none">
            <Label
              htmlFor="sendOverageInvoice"
              className={cn(
                "cursor-pointer",
                overflowStatus !== OVERFLOW_STATUSES.APPROVED && "opacity-50"
              )}
            >
              Create and send overage invoice now
            </Label>
            <p className="text-[10px] text-muted-foreground">
              Uses the client hourly rate and sends a Stripe invoice after approval.
            </p>
          </div>
        </div>
      </div>

      <Button type="submit" className="w-full" disabled={isSubmitting}>
        {isSubmitting ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Saving...
          </>
        ) : (
          "Update Overflow & Priority"
        )}
      </Button>
    </form>
  );
}
