"use client";

import { useState } from "react";
import { Loader2 } from "lucide-react";

import { archiveClient, activateClient } from "@/app/actions/clients";
import { ClientStatus } from "@/generated/prisma/client";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export function ArchiveClientPanel(props: {
  clientId: string;
  companyName: string;
  status: ClientStatus;
}) {
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const canArchive =
    props.status === ClientStatus.ACTIVE || props.status === ClientStatus.PAUSED;
  const canReactivate =
    props.status === ClientStatus.CANCELLED || props.status === ClientStatus.PAUSED;

  if (!canArchive && !canReactivate) {
    return null;
  }

  async function handleArchive() {
    const confirmed = window.confirm(
      `Archive ${props.companyName}? Portal access will stop but all history is kept.`,
    );
    if (!confirmed) return;

    setSaving(true);
    setMessage(null);
    setError(null);
    try {
      const result = await archiveClient(props.clientId);
      if ("error" in result && result.error) setError(result.error);
      else setMessage("Company archived. Portal users can no longer sign in.");
    } finally {
      setSaving(false);
    }
  }

  async function handleReactivate() {
    setSaving(true);
    setMessage(null);
    setError(null);
    try {
      const result = await activateClient(props.clientId);
      if ("error" in result && result.error) setError(result.error);
      else {
        setMessage("Company reactivated. Set up billing and portal access when ready.");
      }
    } finally {
      setSaving(false);
    }
  }

  return (
    <Card className="border-slate-200">
      <CardHeader>
        <CardTitle className="text-base">Company lifecycle</CardTitle>
        <CardDescription>
          Archive stops portal access and hides the company from active lists. All
          requests, time, and billing history are kept. Reactivate to restore service.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex flex-wrap gap-2">
          {canArchive && (
            <Button
              type="button"
              variant="outline"
              onClick={handleArchive}
              disabled={saving}
            >
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              <span className="ml-2">Archive company</span>
            </Button>
          )}
          {canReactivate && (
            <Button type="button" onClick={handleReactivate} disabled={saving}>
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              <span className="ml-2">Reactivate company</span>
            </Button>
          )}
        </div>
        {message && <p className="text-sm text-emerald-700">{message}</p>}
        {error && <p className="text-sm text-red-600">{error}</p>}
      </CardContent>
    </Card>
  );
}
