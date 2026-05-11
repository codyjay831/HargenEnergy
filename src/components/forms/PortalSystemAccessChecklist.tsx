"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { submitClientSystemAccessHandoff } from "@/app/actions/system-access";
import {
  SystemAccessMethod,
  SystemAccessStatus,
  SystemAccessType,
} from "@/generated/prisma/client";
import { Loader2 } from "lucide-react";

interface AccessItem {
  id: string;
  systemType: SystemAccessType;
  label: string;
  loginUrl: string | null;
  username: string | null;
  accessMethod: SystemAccessMethod;
  vaultLink: string | null;
  status: SystemAccessStatus;
  notes: string | null;
}

const TYPE_LABELS: Record<SystemAccessType, string> = {
  AHJ: "AHJ / permitting",
  UTILITY: "Utility portal",
  CRM: "CRM",
  EMAIL: "Email / workspace",
  OTHER: "Other",
};

export function PortalSystemAccessChecklist({ items }: { items: AccessItem[] }) {
  const [loadingId, setLoadingId] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (
    accessId: string,
    formData: {
      accessMethod: SystemAccessMethod;
      vaultLink: string;
      username: string;
      notes: string;
    },
  ) => {
    setLoadingId(accessId);
    setMessage(null);
    setError(null);
    const result = await submitClientSystemAccessHandoff({
      accessId,
      accessMethod: formData.accessMethod,
      vaultLink: formData.vaultLink || null,
      username: formData.username || null,
      notes: formData.notes || null,
    });
    if (result.error) {
      setError(result.error);
    } else {
      setMessage("Access details saved.");
    }
    setLoadingId(null);
  };

  if (items.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        No system access items are required yet. Your account manager will add AHJ, utility, CRM, and other logins here when onboarding begins.
      </p>
    );
  }

  return (
    <div className="space-y-6">
      {items.map((item) => (
        <AccessHandoffCard
          key={item.id}
          item={item}
          isLoading={loadingId === item.id}
          onSubmit={(formData) => handleSubmit(item.id, formData)}
        />
      ))}
      {message && <p className="text-sm text-emerald-700">{message}</p>}
      {error && <p className="text-sm text-red-600">{error}</p>}
    </div>
  );
}

function AccessHandoffCard({
  item,
  isLoading,
  onSubmit,
}: {
  item: AccessItem;
  isLoading: boolean;
  onSubmit: (formData: {
    accessMethod: SystemAccessMethod;
    vaultLink: string;
    username: string;
    notes: string;
  }) => void;
}) {
  const [accessMethod, setAccessMethod] = useState(item.accessMethod);
  const [vaultLink, setVaultLink] = useState(item.vaultLink ?? "");
  const [username, setUsername] = useState(item.username ?? "");
  const [notes, setNotes] = useState(item.notes ?? "");

  return (
    <div className="rounded-lg border p-4 space-y-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="font-medium">{item.label}</p>
          <p className="text-xs text-muted-foreground">{TYPE_LABELS[item.systemType]}</p>
          {item.loginUrl && (
            <p className="text-xs text-muted-foreground break-all mt-1">{item.loginUrl}</p>
          )}
        </div>
        <Badge variant="outline">{item.status.replace(/_/g, " ")}</Badge>
      </div>
      <div className="space-y-2">
        <Label>How you will share access</Label>
        <Select
          value={accessMethod}
          onValueChange={(value) => setAccessMethod(value as SystemAccessMethod)}
        >
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={SystemAccessMethod.VAULT_LINK}>
              1Password / Bitwarden share link
            </SelectItem>
            <SelectItem value={SystemAccessMethod.CLIENT_WILL_INVITE}>
              I will invite your user
            </SelectItem>
          </SelectContent>
        </Select>
      </div>
      {accessMethod === SystemAccessMethod.VAULT_LINK && (
        <div className="space-y-2">
          <Label>Vault share link</Label>
          <Input value={vaultLink} onChange={(e) => setVaultLink(e.target.value)} />
        </div>
      )}
      <div className="space-y-2">
        <Label>Username (optional)</Label>
        <Input value={username} onChange={(e) => setUsername(e.target.value)} />
      </div>
      <div className="space-y-2">
        <Label>Notes</Label>
        <Input value={notes} onChange={(e) => setNotes(e.target.value)} />
      </div>
      <Button
        type="button"
        disabled={isLoading}
        onClick={() => onSubmit({ accessMethod, vaultLink, username, notes })}
      >
        {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
        <span className="ml-2">Save access details</span>
      </Button>
    </div>
  );
}
