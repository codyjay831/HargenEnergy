"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { activateClient } from "@/app/actions/clients";
import { Loader2 } from "lucide-react";

interface ActivateClientButtonProps {
  clientId: string;
  buttonLabel?: string;
  isLoadingLabel?: string;
  successMessage?: string;
  confirmMessage?: string;
  disabled?: boolean;
  disabledReasons?: string[];
}

export function ActivateClientButton({
  clientId,
  buttonLabel = "Activate client",
  isLoadingLabel = "Activating...",
  successMessage = "Client marked active. Set up billing and send a portal invite when ready.",
  confirmMessage,
  disabled = false,
  disabledReasons = [],
}: ActivateClientButtonProps) {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleActivate = async () => {
    if (disabled) {
      return;
    }
    if (confirmMessage && !window.confirm(confirmMessage)) {
      return;
    }

    setIsLoading(true);
    setMessage(null);
    setError(null);

    try {
      const result = await activateClient(clientId);
      if ("error" in result && result.error) {
        setError(result.error);
      } else {
        setMessage(successMessage);
        router.refresh();
      }
    } catch (activateError: unknown) {
      setError(
        activateError instanceof Error
          ? activateError.message
          : "Failed to activate client.",
      );
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-2">
      <Button type="button" onClick={handleActivate} disabled={isLoading || disabled}>
        {isLoading ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            {isLoadingLabel}
          </>
        ) : (
          buttonLabel
        )}
      </Button>
      {disabledReasons.map((reason) => (
        <p key={reason} className="text-sm text-amber-800">
          {reason}
        </p>
      ))}
      {message && <p className="text-sm text-green-700">{message}</p>}
      {error && <p className="text-sm text-red-600">{error}</p>}
    </div>
  );
}
