"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
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
import {
  createClientSystemAccessFromPortal,
  submitClientSystemAccessHandoff,
} from "@/app/actions/system-access";
import {
  SystemAccessMethod,
  SystemAccessStatus,
  SystemAccessType,
} from "@/generated/prisma/client";
import { Loader2, Plus } from "lucide-react";

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
  createdViaPortal: boolean;
}

const TYPE_LABELS: Record<SystemAccessType, string> = {
  AHJ: "AHJ / permitting",
  UTILITY: "Utility portal",
  CRM: "CRM",
  EMAIL: "Email / workspace",
  OTHER: "Other",
};

export function PortalSystemAccessChecklist({ items }: { items: AccessItem[] }) {
  const router = useRouter();
  const [loadingId, setLoadingId] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const requestedItems = items.filter((item) => !item.createdViaPortal);
  const selfAddedItems = items.filter((item) => item.createdViaPortal);

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
      router.refresh();
    }
    setLoadingId(null);
  };

  const handleAdd = async (form: {
    systemType: SystemAccessType;
    label: string;
    loginUrl: string;
    accessMethod: SystemAccessMethod;
    vaultLink: string;
    username: string;
    notes: string;
  }) => {
    setAdding(true);
    setMessage(null);
    setError(null);
    const result = await createClientSystemAccessFromPortal({
      systemType: form.systemType,
      label: form.label,
      loginUrl: form.loginUrl || null,
      accessMethod: form.accessMethod,
      vaultLink: form.vaultLink || null,
      username: form.username || null,
      notes: form.notes || null,
    });
    if (result.error) {
      setError(result.error);
    } else {
      setMessage("System access added.");
      router.refresh();
    }
    setAdding(false);
  };

  return (
    <div className="space-y-8">
      <p className="text-sm text-muted-foreground">
        Sharing access is optional but recommended. Respond to Hargen requests or add systems
        yourself.
      </p>

      <AddSystemForm isLoading={adding} onAdd={handleAdd} />

      {requestedItems.length > 0 && (
        <section className="space-y-4">
          <h3 className="text-sm font-semibold">Requested by Hargen</h3>
          {requestedItems.map((item) => (
            <AccessHandoffCard
              key={item.id}
              item={item}
              sourceLabel="Requested by Hargen"
              isLoading={loadingId === item.id}
              onSubmit={(formData) => handleSubmit(item.id, formData)}
            />
          ))}
        </section>
      )}

      {selfAddedItems.length > 0 && (
        <section className="space-y-4">
          <h3 className="text-sm font-semibold">Added by you</h3>
          {selfAddedItems.map((item) => (
            <AccessHandoffCard
              key={item.id}
              item={item}
              sourceLabel="Added by you"
              isLoading={loadingId === item.id}
              onSubmit={(formData) => handleSubmit(item.id, formData)}
            />
          ))}
        </section>
      )}

      {items.length === 0 && (
        <p className="text-sm text-muted-foreground">
          No access items yet. Add a system above or wait for Hargen to request specific logins.
        </p>
      )}

      {message && <p className="text-sm text-emerald-700">{message}</p>}
      {error && <p className="text-sm text-red-600">{error}</p>}
    </div>
  );
}

function AddSystemForm({
  isLoading,
  onAdd,
}: {
  isLoading: boolean;
  onAdd: (form: {
    systemType: SystemAccessType;
    label: string;
    loginUrl: string;
    accessMethod: SystemAccessMethod;
    vaultLink: string;
    username: string;
    notes: string;
  }) => void;
}) {
  const [systemType, setSystemType] = useState<SystemAccessType>(SystemAccessType.OTHER);
  const [label, setLabel] = useState("");
  const [loginUrl, setLoginUrl] = useState("");
  const [accessMethod, setAccessMethod] = useState<SystemAccessMethod>(
    SystemAccessMethod.VAULT_LINK,
  );
  const [vaultLink, setVaultLink] = useState("");
  const [username, setUsername] = useState("");
  const [notes, setNotes] = useState("");

  return (
    <div className="rounded-lg border border-dashed p-4 space-y-4">
      <div className="flex items-center gap-2">
        <Plus className="h-4 w-4 text-muted-foreground" />
        <p className="text-sm font-medium">Add system access</p>
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="space-y-2">
          <Label>System type</Label>
          <Select
            value={systemType}
            onValueChange={(value) => setSystemType(value as SystemAccessType)}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {Object.entries(TYPE_LABELS).map(([value, text]) => (
                <SelectItem key={value} value={value}>
                  {text}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label>Label</Label>
          <Input value={label} onChange={(e) => setLabel(e.target.value)} />
        </div>
      </div>
      <div className="space-y-2">
        <Label>Login URL (optional)</Label>
        <Input value={loginUrl} onChange={(e) => setLoginUrl(e.target.value)} />
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
        <Label>Notes (optional)</Label>
        <Input value={notes} onChange={(e) => setNotes(e.target.value)} />
      </div>
      <Button
        type="button"
        disabled={isLoading || !label.trim()}
        onClick={() =>
          onAdd({ systemType, label, loginUrl, accessMethod, vaultLink, username, notes })
        }
      >
        {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
        <span className="ml-2">Add system</span>
      </Button>
    </div>
  );
}

function AccessHandoffCard({
  item,
  sourceLabel,
  isLoading,
  onSubmit,
}: {
  item: AccessItem;
  sourceLabel: string;
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
        <div className="flex flex-col items-end gap-1">
          <Badge variant="outline">{sourceLabel}</Badge>
          <Badge variant="outline">{item.status.replace(/_/g, " ")}</Badge>
        </div>
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
