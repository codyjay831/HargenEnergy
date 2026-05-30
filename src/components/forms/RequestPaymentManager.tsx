"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { createRequestPaymentCheckoutSession } from "@/app/actions/stripe";
import { updateRequestPaymentStatus } from "@/app/actions/requests";
import { Loader2 } from "lucide-react";

type RequestPaymentManagerProps = {
  requestId: string;
  canCreateCheckout: boolean;
  paymentStatus: "NOT_REQUIRED" | "PENDING" | "PAID" | "WAIVED";
};

export function RequestPaymentManager({
  requestId,
  canCreateCheckout,
  paymentStatus,
}: RequestPaymentManagerProps) {
  const router = useRouter();
  const [isCheckoutLoading, setIsCheckoutLoading] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const handleCreateCheckout = async () => {
    setIsCheckoutLoading(true);
    setError(null);
    try {
      const result = await createRequestPaymentCheckoutSession(requestId);
      if (result.url) {
        window.location.href = result.url;
      }
    } catch (checkoutError: unknown) {
      setError(
        checkoutError instanceof Error
          ? checkoutError.message
          : "Could not create payment link.",
      );
    } finally {
      setIsCheckoutLoading(false);
    }
  };

  const handleSetStatus = (nextStatus: "PENDING" | "PAID" | "WAIVED" | "NOT_REQUIRED") => {
    startTransition(async () => {
      setError(null);
      const result = await updateRequestPaymentStatus({
        requestId,
        paymentStatus: nextStatus,
      });
      if ("error" in result && result.error) {
        setError(result.error);
        return;
      }
      router.refresh();
    });
  };

  return (
    <div className="space-y-3 rounded-md border bg-slate-50 p-3">
      <p className="text-xs text-muted-foreground">
        Fixed-fee work must be paid or waived before billable execution.
      </p>
      {canCreateCheckout && (
        <Button
          type="button"
          size="sm"
          onClick={handleCreateCheckout}
          disabled={isCheckoutLoading || isPending}
        >
          {isCheckoutLoading ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : null}
          Create payment link
        </Button>
      )}
      <div className="flex flex-wrap gap-2">
        <Button
          type="button"
          size="sm"
          variant={paymentStatus === "PENDING" ? "default" : "outline"}
          onClick={() => handleSetStatus("PENDING")}
          disabled={isPending}
        >
          Mark pending
        </Button>
        <Button
          type="button"
          size="sm"
          variant={paymentStatus === "PAID" ? "default" : "outline"}
          onClick={() => handleSetStatus("PAID")}
          disabled={isPending}
        >
          Mark paid
        </Button>
        <Button
          type="button"
          size="sm"
          variant={paymentStatus === "WAIVED" ? "default" : "outline"}
          onClick={() => handleSetStatus("WAIVED")}
          disabled={isPending}
        >
          Waive
        </Button>
      </div>
      {error && <p className="text-xs text-red-600">{error}</p>}
    </div>
  );
}
