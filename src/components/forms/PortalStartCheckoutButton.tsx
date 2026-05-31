"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { createClientCheckoutSession } from "@/app/actions/stripe";
import { CreditCard, Loader2 } from "lucide-react";

export function PortalStartCheckoutButton() {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleStart = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const result = await createClientCheckoutSession();
      if (result.url) {
        window.location.href = result.url;
      }
    } catch (checkoutError: unknown) {
      setError(
        checkoutError instanceof Error
          ? checkoutError.message
          : "Could not start billing checkout.",
      );
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-2">
      <Button type="button" onClick={handleStart} disabled={isLoading}>
        {isLoading ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <CreditCard className="h-4 w-4" />
        )}
        <span className="ml-2">Start billing</span>
      </Button>
      {error && <p className="text-sm text-red-600">{error}</p>}
    </div>
  );
}
