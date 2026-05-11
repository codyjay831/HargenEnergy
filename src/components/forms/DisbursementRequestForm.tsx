"use client";

import { useState } from "react";
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
import { createDisbursementRequest } from "@/app/actions/disbursements";
import { DisbursementPaymentMethod } from "@/generated/prisma/client";
import { Loader2 } from "lucide-react";

interface DisbursementRequestFormProps {
  clientId: string;
  supportRequestId: string;
}

export function DisbursementRequestForm({
  clientId,
  supportRequestId,
}: DisbursementRequestFormProps) {
  const [vendor, setVendor] = useState("");
  const [purpose, setPurpose] = useState("");
  const [amount, setAmount] = useState("");
  const [paymentMethod, setPaymentMethod] = useState<DisbursementPaymentMethod>(
    DisbursementPaymentMethod.HARGEN_PAYS,
  );
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async () => {
    setIsLoading(true);
    setMessage(null);
    setError(null);
    const amountCents = Math.round(Number(amount) * 100);
    if (!Number.isFinite(amountCents) || amountCents <= 0) {
      setError("Enter a valid amount.");
      setIsLoading(false);
      return;
    }
    try {
      const result = await createDisbursementRequest({
        clientId,
        supportRequestId,
        vendor,
        purpose,
        amountCents,
        currency: "USD",
        paymentMethod,
      });
      if (result.error) {
        setError(result.error);
      } else {
        setVendor("");
        setPurpose("");
        setAmount("");
        setMessage("Disbursement request sent for client approval.");
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label>Vendor</Label>
        <Input value={vendor} onChange={(e) => setVendor(e.target.value)} />
      </div>
      <div className="space-y-2">
        <Label>Amount (USD)</Label>
        <Input
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          inputMode="decimal"
          placeholder="250.00"
        />
      </div>
      <div className="space-y-2">
        <Label>Purpose</Label>
        <Textarea value={purpose} onChange={(e) => setPurpose(e.target.value)} rows={3} />
      </div>
      <div className="space-y-2">
        <Label>Payment path</Label>
        <Select
          value={paymentMethod}
          onValueChange={(value) =>
            setPaymentMethod(value as DisbursementPaymentMethod)
          }
        >
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={DisbursementPaymentMethod.HARGEN_PAYS}>
              Hargen pays after approval
            </SelectItem>
            <SelectItem value={DisbursementPaymentMethod.CLIENT_PAYS_DIRECT}>
              Client pays authority directly
            </SelectItem>
            <SelectItem value={DisbursementPaymentMethod.REIMBURSE_HARGEN}>
              Reimburse Hargen after approval
            </SelectItem>
          </SelectContent>
        </Select>
      </div>
      <Button type="button" disabled={isLoading} onClick={handleSubmit}>
        {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
        <span className="ml-2">Request approval</span>
      </Button>
      {message && <p className="text-sm text-emerald-700">{message}</p>}
      {error && <p className="text-sm text-red-600">{error}</p>}
    </div>
  );
}
