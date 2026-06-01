"use client";

import { useState, useTransition } from "react";
import { AgreementPacketStatus } from "@/generated/prisma/client";
import {
  createAgreementPacketSigningLink,
  markAgreementPacketManuallySigned,
} from "@/app/actions/agreement-packet";
import { adminAgreementPdfDownloadUrl } from "@/lib/app-url";
import { canCreateSigningLink, canMarkManuallySigned } from "@/lib/agreements/status";
import { Button, buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { format } from "date-fns";
import { Copy, Loader2 } from "lucide-react";
import Link from "next/link";

export type SigningLinkRow = {
  id: string;
  status: string;
  expiresAt: Date;
  openedAt: Date | null;
  usedAt: Date | null;
  revokedAt: Date | null;
  createdAt: Date;
};

export type AcceptanceRow = {
  id: string;
  acceptanceType: string;
  signerName: string;
  signerTitle: string;
  signerEmail: string;
  signedAt: Date;
  source: string;
  ipAddress: string | null;
};

type AgreementPacketSigningPanelProps = {
  packetId: string;
  status: AgreementPacketStatus;
  hasSignedPdf: boolean;
  signingLinks: SigningLinkRow[];
  acceptances: AcceptanceRow[];
};

export function AgreementPacketSigningPanel({
  packetId,
  status,
  hasSignedPdf,
  signingLinks,
  acceptances,
}: AgreementPacketSigningPanelProps) {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [signingUrl, setSigningUrl] = useState<string | null>(null);
  const [manualNote, setManualNote] = useState("");
  const [copied, setCopied] = useState(false);

  const showSigning = canCreateSigningLink(status);
  const showManual = canMarkManuallySigned(status) && acceptances.length === 0;

  const copyUrl = async () => {
    if (!signingUrl) return;
    await navigator.clipboard.writeText(signingUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const createLink = (regenerate: boolean) => {
    setError(null);
    startTransition(async () => {
      const result = await createAgreementPacketSigningLink({ packetId, regenerate });
      if (result.error) {
        setError(result.error);
        return;
      }
      if (result.signingUrl) {
        setSigningUrl(result.signingUrl);
      }
      if (regenerate) {
        window.location.reload();
      }
    });
  };

  const submitManual = (formData: FormData) => {
    setError(null);
    formData.set("packetId", packetId);
    formData.set("note", manualNote);
    startTransition(async () => {
      const result = await markAgreementPacketManuallySigned(formData);
      if (result.error) {
        setError(result.error);
        return;
      }
      window.location.reload();
    });
  };

  return (
    <div className="space-y-6">
      {showSigning && (
        <div className="space-y-3">
          <h3 className="text-sm font-semibold text-slate-900">Online signing link</h3>
          <div className="flex flex-wrap gap-2">
            <Button
              variant="outline"
              disabled={isPending}
              onClick={() => createLink(false)}
            >
              {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {signingLinks.some((l) => l.status === "ACTIVE") ? "Copy signing URL" : "Create signing link"}
            </Button>
            <Button
              variant="outline"
              disabled={isPending}
              onClick={() => createLink(true)}
            >
              Regenerate link
            </Button>
          </div>
          {signingUrl && (
            <div className="flex flex-wrap items-center gap-2 max-w-2xl">
              <Input readOnly value={signingUrl} className="font-mono text-xs" />
              <Button type="button" variant="outline" size="icon" onClick={copyUrl}>
                <Copy className="h-4 w-4" />
              </Button>
              {copied && <span className="text-xs text-emerald-700">Copied</span>}
            </div>
          )}
          <p className="text-xs text-muted-foreground">
            Creating a new link revokes any prior active link. Links expire after 14 days.
          </p>
        </div>
      )}

      {hasSignedPdf && (
        <div>
          <Link
            href={adminAgreementPdfDownloadUrl(packetId, "signed")}
            className={buttonVariants({ variant: "outline" })}
          >
            Download signed PDF
          </Link>
        </div>
      )}

      {showManual && (
        <form action={submitManual} className="space-y-3 border-t pt-4 max-w-xl">
          <h3 className="text-sm font-semibold text-slate-900">Record manual signature</h3>
          <p className="text-xs text-muted-foreground">
            Use when the client signed outside this app (e.g. wet signature or DocuSign). Upload the
            executed PDF.
          </p>
          <div className="space-y-2">
            <Label htmlFor="manual-note">How was this signed? (required)</Label>
            <Textarea
              id="manual-note"
              name="note"
              rows={2}
              value={manualNote}
              onChange={(e) => setManualNote(e.target.value)}
              disabled={isPending}
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="manual-pdf">Signed PDF (required)</Label>
            <Input
              id="manual-pdf"
              name="pdf"
              type="file"
              accept="application/pdf"
              disabled={isPending}
              required
            />
          </div>
          <Button type="submit" variant="outline" disabled={isPending || !manualNote.trim()}>
            {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Mark manually signed
          </Button>
        </form>
      )}

      {signingLinks.length > 0 && (
        <div className="space-y-2 border-t pt-4">
          <h3 className="text-sm font-semibold text-slate-900">Signing links</h3>
          <ul className="text-sm space-y-2">
            {signingLinks.map((link) => (
              <li
                key={link.id}
                className="rounded-md border border-slate-200 px-3 py-2 flex flex-wrap justify-between gap-2"
              >
                <span className="font-mono text-xs text-slate-600">{link.id.slice(0, 10)}…</span>
                <span className="text-slate-800">{link.status}</span>
                <span className="text-xs text-muted-foreground w-full">
                  Expires {format(new Date(link.expiresAt), "MMM d, yyyy")}
                  {link.openedAt &&
                    ` · Opened ${format(new Date(link.openedAt), "MMM d, yyyy h:mm a")}`}
                  {link.usedAt &&
                    ` · Used ${format(new Date(link.usedAt), "MMM d, yyyy h:mm a")}`}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {acceptances.length > 0 && (
        <div className="space-y-2 border-t pt-4">
          <h3 className="text-sm font-semibold text-slate-900">Acceptances</h3>
          <ul className="text-sm space-y-2">
            {acceptances.map((row) => (
              <li key={row.id} className="rounded-md border border-slate-200 px-3 py-2">
                <p className="font-medium text-slate-900">{row.acceptanceType.replace(/_/g, " ")}</p>
                <p className="text-slate-700">
                  {row.signerName} · {row.signerTitle} · {row.signerEmail}
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  {format(new Date(row.signedAt), "MMM d, yyyy h:mm a")} · {row.source}
                  {row.ipAddress ? ` · ${row.ipAddress}` : ""}
                </p>
              </li>
            ))}
          </ul>
        </div>
      )}

      {error && <p className="text-sm text-red-600">{error}</p>}
    </div>
  );
}
