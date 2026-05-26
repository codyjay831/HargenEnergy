"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";

import { deleteClientPermanently } from "@/app/actions/clients";
import { ClientStatus } from "@/generated/prisma/client";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function DeleteClientPanel(props: {
  clientId: string;
  companyName: string;
  status: ClientStatus;
  canDelete: boolean;
}) {
  const router = useRouter();
  const [confirmName, setConfirmName] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!props.canDelete || props.status !== ClientStatus.LEAD) {
    return null;
  }

  const confirmed = confirmName === props.companyName;

  async function handleDelete() {
    setSaving(true);
    setError(null);
    try {
      const result = await deleteClientPermanently({
        clientId: props.clientId,
        confirmCompanyName: confirmName,
      });
      if ("error" in result && result.error) {
        setError(result.error);
      } else {
        router.push("/admin/clients");
        router.refresh();
      }
    } finally {
      setSaving(false);
    }
  }

  return (
    <Card className="border-red-200 bg-red-50/30">
      <CardHeader>
        <CardTitle className="text-base text-red-900">Delete test company</CardTitle>
        <CardDescription>
          Permanently removes this prospect and all related walkthrough data. This
          cannot be undone. Use only for test or junk companies that were never
          activated.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="confirm-company-name">
            Type <span className="font-medium">{props.companyName}</span> to confirm
          </Label>
          <Input
            id="confirm-company-name"
            value={confirmName}
            onChange={(event) => setConfirmName(event.target.value)}
            placeholder={props.companyName}
            disabled={saving}
            autoComplete="off"
          />
        </div>
        <Button
          type="button"
          variant="destructive"
          onClick={handleDelete}
          disabled={saving || !confirmed}
        >
          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
          <span className="ml-2">Delete permanently</span>
        </Button>
        {error && <p className="text-sm text-red-600">{error}</p>}
      </CardContent>
    </Card>
  );
}
