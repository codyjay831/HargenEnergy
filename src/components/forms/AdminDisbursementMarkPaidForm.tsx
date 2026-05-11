"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { markDisbursementPaid } from "@/app/actions/disbursements";
import { DisbursementStatus } from "@/generated/prisma/client";
import { Loader2 } from "lucide-react";

export function AdminDisbursementMarkPaidForm({
  disbursementId,
  mode,
}: {
  disbursementId: string;
  mode: "PAID" | "CLIENT_PAID_DIRECT";
}) {
  const [receiptUrl, setReceiptUrl] = useState("");
  const [receiptNotes, setReceiptNotes] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async () => {
    setIsLoading(true);
    setMessage(null);
    setError(null);
    const result = await markDisbursementPaid({
      disbursementId,
      receiptUrl: receiptUrl || null,
      receiptNotes: receiptNotes || null,
      status:
        mode === "PAID"
          ? DisbursementStatus.PAID
          : DisbursementStatus.CLIENT_PAID_DIRECT,
    });
    if (result.error) {
      setError(result.error);
    } else {
      setMessage("Payment status updated.");
    }
    setIsLoading(false);
  };

  return (
    <div className="space-y-3 rounded-md border p-3">
      <div className="space-y-2">
        <Label>Receipt URL</Label>
        <Input value={receiptUrl} onChange={(e) => setReceiptUrl(e.target.value)} />
      </div>
      <div className="space-y-2">
        <Label>Notes</Label>
        <Input value={receiptNotes} onChange={(e) => setReceiptNotes(e.target.value)} />
      </div>
      <Button type="button" size="sm" disabled={isLoading} onClick={handleSubmit}>
        {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
        <span className="ml-2">
          {mode === "PAID" ? "Mark paid" : "Mark client paid direct"}
        </span>
      </Button>
      {message && <p className="text-xs text-emerald-700">{message}</p>}
      {error && <p className="text-xs text-red-600">{error}</p>}
    </div>
  );
}
