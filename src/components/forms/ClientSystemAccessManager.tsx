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
import {
  createClientSystemAccess,
  updateClientSystemAccess,
  verifyClientSystemAccess,
} from "@/app/actions/system-access";
import {
  SystemAccessMethod,
  SystemAccessStatus,
  SystemAccessType,
} from "@/generated/prisma/client";
import { Badge } from "@/components/ui/badge";
import { Loader2, ShieldCheck } from "lucide-react";

interface SystemAccessRecord {
  id: string;
  systemType: SystemAccessType;
  label: string;
  loginUrl: string | null;
  username: string | null;
  accessMethod: SystemAccessMethod;
  vaultLink: string | null;
  adminSecureNote: string | null;
  status: SystemAccessStatus;
  notes: string | null;
}

interface ClientSystemAccessManagerProps {
  clientId: string;
  records: SystemAccessRecord[];
}

const TYPE_LABELS: Record<SystemAccessType, string> = {
  AHJ: "AHJ / permitting",
  UTILITY: "Utility portal",
  CRM: "CRM",
  EMAIL: "Email / workspace",
  OTHER: "Other",
};

const ACCESS_PRESETS: Array<{ type: SystemAccessType; label: string }> = [
  { type: SystemAccessType.AHJ, label: "AHJ portal" },
  { type: SystemAccessType.UTILITY, label: "Utility portal" },
  { type: SystemAccessType.CRM, label: "CRM" },
  { type: SystemAccessType.EMAIL, label: "Email / workspace" },
];

export function ClientSystemAccessManager({
  clientId,
  records,
}: ClientSystemAccessManagerProps) {
  const [label, setLabel] = useState("");
  const [systemType, setSystemType] = useState<SystemAccessType>(
    SystemAccessType.AHJ,
  );
  const [loginUrl, setLoginUrl] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [verifyingId, setVerifyingId] = useState<string | null>(null);

  const handleCreate = async () => {
    setIsLoading(true);
    setMessage(null);
    setError(null);
    try {
      const result = await createClientSystemAccess({
        clientId,
        label,
        systemType,
        loginUrl: loginUrl || null,
        accessMethod: SystemAccessMethod.VAULT_LINK,
      });
      if (result.error) {
        setError(result.error);
      } else {
        setLabel("");
        setLoginUrl("");
        setMessage("Access item added.");
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleVerify = async (accessId: string) => {
    setVerifyingId(accessId);
    setMessage(null);
    setError(null);
    try {
      const result = await verifyClientSystemAccess(accessId);
      if (result.error) {
        setError(result.error);
      } else {
        setMessage("Marked verified.");
      }
    } finally {
      setVerifyingId(null);
    }
  };

  const handleNoteSave = async (accessId: string, adminSecureNote: string) => {
    const result = await updateClientSystemAccess(accessId, { adminSecureNote });
    if (result.error) {
      setError(result.error);
    } else {
      setMessage("Secure note saved.");
    }
  };

  const handlePreset = async (preset: { type: SystemAccessType; label: string }) => {
    setIsLoading(true);
    setMessage(null);
    setError(null);
    try {
      const result = await createClientSystemAccess({
        clientId,
        label: preset.label,
        systemType: preset.type,
        loginUrl: null,
        accessMethod: SystemAccessMethod.VAULT_LINK,
      });
      if (result.error) {
        setError(result.error);
      } else {
        setMessage(`${preset.label} requested.`);
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <p className="text-sm text-muted-foreground">
          System access is optional. Request logins from the customer or add items manually.
        </p>
        <div className="flex flex-wrap gap-2">
          {ACCESS_PRESETS.map((preset) => (
            <Button
              key={preset.label}
              type="button"
              size="sm"
              variant="outline"
              disabled={isLoading}
              onClick={() => handlePreset(preset)}
            >
              + {preset.label}
            </Button>
          ))}
        </div>
      </div>
      <div className="space-y-3">
        {records.map((record) => (
          <div key={record.id} className="rounded-md border p-4 space-y-3">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="font-medium">{record.label}</p>
                <p className="text-xs text-muted-foreground">
                  {TYPE_LABELS[record.systemType]}
                </p>
              </div>
              <Badge variant="outline">{record.status.replace(/_/g, " ")}</Badge>
            </div>
            {record.loginUrl && (
              <p className="text-sm break-all text-muted-foreground">{record.loginUrl}</p>
            )}
            {record.vaultLink && (
              <p className="text-sm break-all">Vault: {record.vaultLink}</p>
            )}
            {record.username && (
              <p className="text-sm">Username: {record.username}</p>
            )}
            <div className="space-y-2">
              <Label>Admin secure note</Label>
              <Input
                defaultValue={record.adminSecureNote ?? ""}
                onBlur={(e) => handleNoteSave(record.id, e.target.value)}
              />
            </div>
            <Button
              type="button"
              size="sm"
              variant="outline"
              disabled={verifyingId === record.id}
              onClick={() => handleVerify(record.id)}
            >
              {verifyingId === record.id ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <ShieldCheck className="h-4 w-4" />
              )}
              <span className="ml-2">Mark verified</span>
            </Button>
          </div>
        ))}
      </div>

      <div className="space-y-3 border-t pt-4">
        <p className="text-sm font-medium">Add required system</p>
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
        <div className="space-y-2">
          <Label>Login URL</Label>
          <Input value={loginUrl} onChange={(e) => setLoginUrl(e.target.value)} />
        </div>
        <Button type="button" disabled={isLoading || !label.trim()} onClick={handleCreate}>
          {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
          <span className="ml-2">Add system</span>
        </Button>
      </div>
      {message && <p className="text-sm text-emerald-700">{message}</p>}
      {error && <p className="text-sm text-red-600">{error}</p>}
    </div>
  );
}
