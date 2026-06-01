"use client";

import { useEffect, useState, useTransition } from "react";
import {
  acceptAgreementPacketOnline,
  recordAgreementSigningPageView,
} from "@/app/actions/agreement-signing";
import { AgreementPacketPreview } from "@/components/admin/agreements/AgreementPacketPreview";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { agreementSigningPdfDownloadUrl } from "@/lib/app-url";
import type { AgreementPacketSnapshot } from "@/lib/agreements/types";
import { Loader2 } from "lucide-react";

type AgreementSigningClientProps = {
  rawToken: string;
  snapshot: AgreementPacketSnapshot;
};

export function AgreementSigningClient({ rawToken, snapshot }: AgreementSigningClientProps) {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [completed, setCompleted] = useState(false);
  const [acceptCsa, setAcceptCsa] = useState(false);
  const [acceptWorkAuth, setAcceptWorkAuth] = useState(false);

  const blocks = snapshot.acceptanceBlocks;
  const csaBlock = blocks[0];
  const workAuthBlock = blocks[1];

  useEffect(() => {
    void recordAgreementSigningPageView(rawToken);
  }, [rawToken]);

  const submit = () => {
    setError(null);
    startTransition(async () => {
      const result = await acceptAgreementPacketOnline({
        rawToken,
        acceptClientServices: acceptCsa,
        acceptWorkAuthorization: acceptWorkAuth,
      });
      if (result.error) {
        setError(result.error);
        return;
      }
      setCompleted(true);
    });
  };

  if (completed) {
    return (
      <div className="space-y-4 rounded-lg border border-emerald-200 bg-emerald-50 p-6 text-center">
        <h2 className="text-lg font-semibold text-emerald-900">Agreement signed</h2>
        <p className="text-sm text-emerald-800">
          Thank you, {snapshot.signerName}. Your acceptance has been recorded.
        </p>
        <a
          href={agreementSigningPdfDownloadUrl(rawToken)}
          className="inline-flex items-center justify-center rounded-md bg-emerald-700 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-800"
        >
          Download signed PDF
        </a>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <AgreementPacketPreview snapshot={snapshot} source="frozen" />

      <div className="rounded-lg border border-slate-200 bg-white p-6 space-y-6">
        <h2 className="text-base font-semibold text-slate-900">Acceptance</h2>
        <p className="text-sm text-muted-foreground">
          By checking each box below, {snapshot.signerName} ({snapshot.signerTitle}) agrees on
          behalf of {snapshot.companyLegalName}.
        </p>

        {csaBlock && (
          <div className="flex items-start gap-3">
            <Checkbox
              id="accept-csa"
              checked={acceptCsa}
              onCheckedChange={(v) => setAcceptCsa(v === true)}
              disabled={isPending}
            />
            <Label htmlFor="accept-csa" className="text-sm leading-relaxed cursor-pointer">
              <span className="font-medium text-slate-900">{csaBlock.title}</span>
              <span className="block mt-1 text-slate-600">{csaBlock.checkboxText}</span>
            </Label>
          </div>
        )}

        {workAuthBlock && (
          <div className="flex items-start gap-3">
            <Checkbox
              id="accept-work-auth"
              checked={acceptWorkAuth}
              onCheckedChange={(v) => setAcceptWorkAuth(v === true)}
              disabled={isPending}
            />
            <Label htmlFor="accept-work-auth" className="text-sm leading-relaxed cursor-pointer">
              <span className="font-medium text-slate-900">{workAuthBlock.title}</span>
              <span className="block mt-1 text-slate-600">{workAuthBlock.checkboxText}</span>
            </Label>
          </div>
        )}

        <Button
          className="w-full sm:w-auto bg-emerald-700 hover:bg-emerald-800"
          disabled={isPending || !acceptCsa || !acceptWorkAuth}
          onClick={submit}
        >
          {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          Sign agreement
        </Button>

        {error && <p className="text-sm text-red-600">{error}</p>}
      </div>
    </div>
  );
}
