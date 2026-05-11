"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  inviteClientPortalUser,
  resendClientPortalInvite,
} from "@/app/actions/client-users";
import { Loader2, Mail, UserPlus } from "lucide-react";

interface PortalUser {
  id: string;
  email: string;
  name: string | null;
}

interface ClientPortalAccessManagerProps {
  clientId: string;
  clientStatus: "LEAD" | "ACTIVE" | "PAUSED" | "CANCELLED";
  defaultEmail: string;
  defaultName: string;
  users: PortalUser[];
}

export function ClientPortalAccessManager({
  clientId,
  clientStatus,
  defaultEmail,
  defaultName,
  users,
}: ClientPortalAccessManagerProps) {
  const canInvite = clientStatus === "ACTIVE";
  const [email, setEmail] = useState(defaultEmail);
  const [name, setName] = useState(defaultName);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [resendingId, setResendingId] = useState<string | null>(null);

  const handleInvite = async () => {
    setIsLoading(true);
    setMessage(null);
    setError(null);
    try {
      const result = await inviteClientPortalUser({ clientId, email, name });
      if ("error" in result && result.error) {
        setError(result.error);
      } else {
        setMessage("Portal invite sent.");
      }
    } catch (inviteError: unknown) {
      setError(
        inviteError instanceof Error
          ? inviteError.message
          : "Failed to send portal invite.",
      );
    } finally {
      setIsLoading(false);
    }
  };

  const handleResend = async (userId: string) => {
    setResendingId(userId);
    setMessage(null);
    setError(null);
    try {
      const result = await resendClientPortalInvite(clientId, userId);
      if ("error" in result && result.error) {
        setError(result.error);
      } else {
        setMessage("Invite resent.");
      }
    } catch (resendError: unknown) {
      setError(
        resendError instanceof Error
          ? resendError.message
          : "Failed to resend invite.",
      );
    } finally {
      setResendingId(null);
    }
  };

  return (
    <div className="space-y-4">
      {!canInvite && (
        <p className="text-sm text-muted-foreground">
          Activate the client before sending a portal invite.
        </p>
      )}
      {users.length > 0 && (
        <div className="space-y-2">
          {users.map((user) => (
            <div
              key={user.id}
              className="flex items-center justify-between gap-3 rounded-md border p-3"
            >
              <div className="min-w-0">
                <p className="text-sm font-medium truncate">{user.email}</p>
                {user.name && (
                  <p className="text-xs text-muted-foreground">{user.name}</p>
                )}
              </div>
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={resendingId === user.id}
                onClick={() => handleResend(user.id)}
              >
                {resendingId === user.id ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Mail className="h-4 w-4" />
                )}
                <span className="ml-2">Resend</span>
              </Button>
            </div>
          ))}
        </div>
      )}

      <div className="space-y-2">
        <Label htmlFor="portal-invite-email">Invite email</Label>
        <Input
          id="portal-invite-email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          type="email"
          autoComplete="off"
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="portal-invite-name">Contact name</Label>
        <Input
          id="portal-invite-name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          autoComplete="off"
        />
      </div>
      <Button type="button" className="w-full" disabled={isLoading || !canInvite} onClick={handleInvite}>
        {isLoading ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <UserPlus className="h-4 w-4" />
        )}
        <span className="ml-2">Invite to portal</span>
      </Button>
      {message && <p className="text-sm text-emerald-700">{message}</p>}
      {error && <p className="text-sm text-red-600">{error}</p>}
    </div>
  );
}
