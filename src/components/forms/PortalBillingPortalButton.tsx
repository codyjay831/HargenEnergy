"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { createClientBillingPortalSession } from "@/app/actions/stripe";
import { CreditCard, Loader2 } from "lucide-react";

export function PortalBillingPortalButton() {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleOpen = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const result = await createClientBillingPortalSession();
      if (result.url) {
        window.location.href = result.url;
      }
    } catch (billingError: unknown) {
      setError(
        billingError instanceof Error
          ? billingError.message
          : "Could not open billing portal.",
      );
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-2">
      <Button type="button" variant="outline" onClick={handleOpen} disabled={isLoading}>
        {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <CreditCard className="h-4 w-4" />}
        <span className="ml-2">Manage retainer billing</span>
      </Button>
      {error && <p className="text-sm text-red-600">{error}</p>}
    </div>
  );
}
