"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  approveDisbursementRequest,
  declineDisbursementRequest,
} from "@/app/actions/disbursements";
import { DisbursementStatus } from "@/generated/prisma/client";
import { Loader2 } from "lucide-react";

interface DisbursementItem {
  id: string;
  vendor: string;
  purpose: string;
  amountCents: number;
  currency: string;
  status: DisbursementStatus;
  paymentMethod: string;
  receiptUrl: string | null;
}

function formatMoney(amountCents: number, currency: string) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: currency.toUpperCase(),
  }).format(amountCents / 100);
}

export function PortalDisbursementPanel({
  disbursements,
}: {
  disbursements: DisbursementItem[];
}) {
  const [loadingId, setLoadingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  if (disbursements.length === 0) {
    return null;
  }

  const handleApprove = async (id: string) => {
    setLoadingId(id);
    setError(null);
    const result = await approveDisbursementRequest(id);
    if (result.error) setError(result.error);
    setLoadingId(null);
  };

  const handleDecline = async (id: string) => {
    setLoadingId(id);
    setError(null);
    const result = await declineDisbursementRequest(id);
    if (result.error) setError(result.error);
    setLoadingId(null);
  };

  return (
    <div className="space-y-3">
      {disbursements.map((item) => (
        <div key={item.id} className="rounded-lg border p-4 space-y-3">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="font-medium">{item.vendor}</p>
              <p className="text-sm text-muted-foreground">{item.purpose}</p>
            </div>
            <Badge variant="outline">{item.status.replace(/_/g, " ")}</Badge>
          </div>
          <p className="text-sm font-semibold">
            {formatMoney(item.amountCents, item.currency)}
          </p>
          {item.status === DisbursementStatus.PENDING_APPROVAL && (
            <div className="flex gap-2">
              <Button
                type="button"
                size="sm"
                disabled={loadingId === item.id}
                onClick={() => handleApprove(item.id)}
              >
                {loadingId === item.id ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : null}
                <span className="ml-2">Approve</span>
              </Button>
              <Button
                type="button"
                size="sm"
                variant="outline"
                disabled={loadingId === item.id}
                onClick={() => handleDecline(item.id)}
              >
                Decline
              </Button>
            </div>
          )}
          {item.receiptUrl && (
            <p className="text-xs break-all text-muted-foreground">
              Receipt: {item.receiptUrl}
            </p>
          )}
        </div>
      ))}
      {error && <p className="text-sm text-red-600">{error}</p>}
    </div>
  );
}
