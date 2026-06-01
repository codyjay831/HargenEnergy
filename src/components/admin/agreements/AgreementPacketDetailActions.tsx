"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { AgreementPacketStatus } from "@/generated/prisma/client";
import {
  generateAgreementPacket,
  markAgreementPacketSentManually,
  returnAgreementPacketToDraft,
  voidAgreementPacket,
  supersedeAgreementPacket,
} from "@/app/actions/agreement-packet";
import { adminAgreementPdfDownloadUrl } from "@/lib/app-url";
import { Button, buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  canGeneratePacket,
  canMarkSentManually,
  canReturnToDraft,
  canSupersedePacket,
  canVoidPacket,
} from "@/lib/agreements/status";
import { adminBtnPrimary } from "@/lib/admin-ui/tokens";
import { Loader2 } from "lucide-react";

type AgreementPacketDetailActionsProps = {
  packetId: string;
  status: AgreementPacketStatus;
  hasSnapshot: boolean;
  hasUnsignedPdf: boolean;
  hasSignedPdf: boolean;
};

export function AgreementPacketDetailActions({
  packetId,
  status,
  hasSnapshot,
  hasUnsignedPdf,
  hasSignedPdf,
}: AgreementPacketDetailActionsProps) {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [sentNote, setSentNote] = useState("");
  const [returnReason, setReturnReason] = useState("");
  const [voidReason, setVoidReason] = useState("");

  const run = (action: () => Promise<{ error?: string; success?: boolean; packetId?: string }>) => {
    setError(null);
    setSuccess(null);
    startTransition(async () => {
      const result = await action();
      if (result.error) {
        setError(result.error);
        return;
      }
      if (result.packetId) {
        window.location.href = `/admin/agreements/${result.packetId}`;
        return;
      }
      setSuccess("Updated.");
      window.location.reload();
    });
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2">
        {canGeneratePacket(status) && (
          <Button
            className={adminBtnPrimary}
            disabled={isPending}
            onClick={() => run(() => generateAgreementPacket(packetId))}
          >
            {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Generate Packet / Ready
          </Button>
        )}

        {hasUnsignedPdf && hasSnapshot && (
          <Link
            href={adminAgreementPdfDownloadUrl(packetId, "unsigned")}
            className={buttonVariants({ variant: "outline" })}
          >
            Download unsigned PDF
          </Link>
        )}

        {hasSignedPdf && (
          <Link
            href={adminAgreementPdfDownloadUrl(packetId, "signed")}
            className={buttonVariants({ variant: "outline" })}
          >
            Download signed PDF
          </Link>
        )}

        {canMarkSentManually(status) && (
          <Button
            variant="outline"
            disabled={isPending || !sentNote.trim()}
            onClick={() =>
              run(() =>
                markAgreementPacketSentManually({ packetId, note: sentNote }),
              )
            }
          >
            Mark Sent Manually / Outside App
          </Button>
        )}

        {canSupersedePacket(status) && (
          <Button
            variant="outline"
            disabled={isPending}
            onClick={() => run(() => supersedeAgreementPacket({ packetId }))}
          >
            Supersede packet
          </Button>
        )}

        {canVoidPacket(status) && (
          <Button
            variant="outline"
            disabled={isPending || !voidReason.trim()}
            onClick={() => run(() => voidAgreementPacket({ packetId, reason: voidReason }))}
          >
            Void packet
          </Button>
        )}
      </div>

      {canMarkSentManually(status) && (
        <div className="space-y-2 max-w-xl">
          <Label htmlFor="sent-note">
            How was this sent outside the app? (required)
          </Label>
          <Textarea
            id="sent-note"
            rows={3}
            value={sentNote}
            onChange={(e) => setSentNote(e.target.value)}
            placeholder="e.g. Emailed unsigned PDF via DocuSign on 2026-06-01"
            disabled={isPending}
          />
          <p className="text-xs text-muted-foreground">
            This records manual delivery only. It does not verify email delivery inside the app.
          </p>
        </div>
      )}

      {canReturnToDraft(status) && (
        <div className="space-y-2 max-w-xl border-t pt-4">
          <Label htmlFor="return-reason">Return to draft (clears snapshot and PDF)</Label>
          <Input
            id="return-reason"
            value={returnReason}
            onChange={(e) => setReturnReason(e.target.value)}
            placeholder="Reason for unlocking edits"
            disabled={isPending}
          />
          <Button
            variant="outline"
            disabled={isPending || !returnReason.trim()}
            onClick={() =>
              run(() =>
                returnAgreementPacketToDraft({ packetId, reason: returnReason }),
              )
            }
          >
            Return to draft
          </Button>
          <p className="text-xs text-amber-800">
            Warning: returning to draft clears the frozen legal snapshot and unsigned PDF. You
            must generate the packet again before sending.
          </p>
        </div>
      )}

      {canVoidPacket(status) && (
        <div className="space-y-2 max-w-xl">
          <Label htmlFor="void-reason">Void reason</Label>
          <Input
            id="void-reason"
            value={voidReason}
            onChange={(e) => setVoidReason(e.target.value)}
            placeholder="Why is this packet void?"
            disabled={isPending}
          />
        </div>
      )}

      {error && <p className="text-sm text-red-600">{error}</p>}
      {success && <p className="text-sm text-emerald-700">{success}</p>}
    </div>
  );
}
