"use client";

import { useState, useTransition } from "react";
import { format } from "date-fns";
import { AgreementStatus } from "@/generated/prisma/client";
import {
  markAgreementNotSent,
  markAgreementSent,
  markAgreementSigned,
  revertAgreementToSent,
  waiveAgreementRequirement,
} from "@/app/actions/agreement";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { AGREEMENT_STATUS_LABELS } from "@/lib/client-agreement";
import { Loader2 } from "lucide-react";

type ClientAgreementManagerProps = {
  clientId: string;
  agreementStatus: AgreementStatus;
  agreementSentAt: Date | null;
  agreementSignedAt: Date | null;
  agreementUrl: string | null;
  agreementNotes: string | null;
  agreementOverrideReason: string | null;
};

export function ClientAgreementManager({
  clientId,
  agreementStatus,
  agreementSentAt,
  agreementSignedAt,
  agreementUrl,
  agreementNotes,
  agreementOverrideReason,
}: ClientAgreementManagerProps) {
  const [isPending, startTransition] = useTransition();
  const [url, setUrl] = useState(agreementUrl ?? "");
  const [notes, setNotes] = useState(agreementNotes ?? "");
  const [revertNote, setRevertNote] = useState("");
  const [waiverReason, setWaiverReason] = useState(agreementOverrideReason ?? "");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const runAction = (action: () => Promise<{ error?: string; success?: boolean }>) => {
    setError(null);
    setSuccess(null);
    startTransition(async () => {
      const result = await action();
      if (result.error) {
        setError(result.error);
        return;
      }
      setSuccess("Agreement updated.");
    });
  };

  return (
    <div className="space-y-4">
      <div className="rounded-md border bg-slate-50 px-3 py-2 text-sm">
        <p className="font-medium text-slate-900">
          Status: {AGREEMENT_STATUS_LABELS[agreementStatus]}
        </p>
        {agreementSentAt && (
          <p className="text-muted-foreground mt-1">
            Sent {format(new Date(agreementSentAt), "MMM d, yyyy")}
          </p>
        )}
        {agreementSignedAt && (
          <p className="text-muted-foreground">
            Signed {format(new Date(agreementSignedAt), "MMM d, yyyy")}
          </p>
        )}
        {agreementOverrideReason && (
          <p className="text-muted-foreground mt-1">Waiver: {agreementOverrideReason}</p>
        )}
      </div>

      <div className="space-y-2">
        <Label htmlFor="agreement-url">Agreement URL (optional)</Label>
        <Input
          id="agreement-url"
          type="url"
          placeholder="https://..."
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          disabled={isPending}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="agreement-notes">Internal notes</Label>
        <Textarea
          id="agreement-notes"
          rows={3}
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          disabled={isPending}
        />
      </div>

      <div className="flex flex-wrap gap-2">
        {agreementStatus === AgreementStatus.NOT_SENT && (
          <Button
            size="sm"
            disabled={isPending}
            onClick={() =>
              runAction(() =>
                markAgreementSent({
                  clientId,
                  agreementUrl: url || null,
                  agreementNotes: notes || null,
                }),
              )
            }
          >
            {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Mark as sent
          </Button>
        )}

        {agreementStatus === AgreementStatus.SENT && (
          <Button
            size="sm"
            disabled={isPending}
            onClick={() =>
              runAction(() =>
                markAgreementSigned({
                  clientId,
                  agreementNotes: notes || null,
                }),
              )
            }
          >
            Mark as signed
          </Button>
        )}

        {(agreementStatus === AgreementStatus.NOT_SENT ||
          agreementStatus === AgreementStatus.SENT) && (
          <Button
            size="sm"
            variant="outline"
            disabled={isPending || !waiverReason.trim()}
            onClick={() =>
              runAction(() =>
                waiveAgreementRequirement({
                  clientId,
                  overrideReason: waiverReason,
                  agreementNotes: notes || null,
                }),
              )
            }
          >
            Waive requirement
          </Button>
        )}

        {(agreementStatus === AgreementStatus.SIGNED ||
          agreementStatus === AgreementStatus.WAIVED) && (
          <div className="w-full space-y-2 border-t pt-3">
            <Label htmlFor="revert-note">Revert note (required)</Label>
            <Input
              id="revert-note"
              value={revertNote}
              onChange={(e) => setRevertNote(e.target.value)}
              placeholder="Why is agreement status changing?"
              disabled={isPending}
            />
            <Button
              size="sm"
              variant="outline"
              disabled={isPending || !revertNote.trim()}
              onClick={() =>
                runAction(() =>
                  agreementStatus === AgreementStatus.SIGNED
                    ? revertAgreementToSent({ clientId, note: revertNote })
                    : markAgreementNotSent({ clientId, note: revertNote }),
                )
              }
            >
              Revert status
            </Button>
          </div>
        )}
      </div>

      {(agreementStatus === AgreementStatus.NOT_SENT ||
        agreementStatus === AgreementStatus.SENT) && (
        <div className="space-y-2">
          <Label htmlFor="waiver-reason">Waiver reason</Label>
          <Input
            id="waiver-reason"
            value={waiverReason}
            onChange={(e) => setWaiverReason(e.target.value)}
            placeholder="Required only to waive"
            disabled={isPending}
          />
        </div>
      )}

      {error && <p className="text-sm text-red-600">{error}</p>}
      {success && <p className="text-sm text-emerald-700">{success}</p>}
    </div>
  );
}
