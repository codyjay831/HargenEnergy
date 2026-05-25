"use client";

import { useState } from "react";
import { Loader2 } from "lucide-react";
import {
  deactivateClientTeamUser,
  inviteClientTeamUser,
  listClientTeamUsers,
  resendClientTeamInvite,
  transferClientOwnership,
} from "@/app/actions/client-users";
import { ClientRole } from "@/generated/prisma/client";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

type TeamRow = Awaited<ReturnType<typeof listClientTeamUsers>>["users"][number];

export function ClientTeamManager(props: {
  currentUserId: string;
  canManage: boolean;
  rows: TeamRow[];
}) {
  const [rows, setRows] = useState(props.rows);
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function refreshRows() {
    const latest = await listClientTeamUsers();
    setRows(latest.users);
  }

  async function runAction(fn: () => Promise<{ error?: string } | { success: boolean }>) {
    setSaving(true);
    setMessage(null);
    setError(null);
    try {
      const result = await fn();
      if ("error" in result && result.error) setError(result.error);
      else setMessage("Saved.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className="rounded-md border p-4 space-y-4">
        <h3 className="font-semibold">Invite Team Member</h3>
        <p className="text-sm text-muted-foreground">
          Team members can submit and manage request work, but only owners can manage billing and approvals.
        </p>
        <div className="grid gap-3 md:grid-cols-3">
          <div className="space-y-2">
            <Label>Email</Label>
            <Input
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="teammate@company.com"
              disabled={!props.canManage || saving}
            />
          </div>
          <div className="space-y-2">
            <Label>Name</Label>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Optional"
              disabled={!props.canManage || saving}
            />
          </div>
          <div className="flex items-end">
            <Button
              type="button"
              disabled={!props.canManage || saving || !email.trim()}
              onClick={() =>
                runAction(async () => {
                  const result = await inviteClientTeamUser({ email, name });
                  if (!("error" in result && result.error)) {
                    setEmail("");
                    setName("");
                    await refreshRows();
                  }
                  return result as { error?: string } | { success: boolean };
                })
              }
              className="w-full"
            >
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              <span className="ml-2">Send Invite</span>
            </Button>
          </div>
        </div>
      </div>

      <div className="rounded-md border p-4">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Role</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Last Login</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((row) => {
              const role = row.clientRole ?? ClientRole.OWNER;
              const isSelf = row.id === props.currentUserId;
              const isDeactivated = !!row.deactivatedAt;
              return (
                <TableRow key={row.id}>
                  <TableCell>{row.name || "—"}</TableCell>
                  <TableCell>{row.email}</TableCell>
                  <TableCell>
                    <Badge variant="outline">
                      {role === ClientRole.OWNER ? "Owner" : "Team Member"}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Badge variant={isDeactivated ? "secondary" : "outline"}>
                      {isDeactivated ? "Deactivated" : "Active"}
                    </Badge>
                  </TableCell>
                  <TableCell>{row.lastLoginAt ? new Date(row.lastLoginAt).toLocaleString() : "—"}</TableCell>
                  <TableCell className="text-right space-x-2">
                    {props.canManage && !isDeactivated ? (
                      <>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          disabled={saving}
                          onClick={() => runAction(() => resendClientTeamInvite(row.id))}
                        >
                          Resend
                        </Button>
                        {role !== ClientRole.OWNER ? (
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            disabled={saving}
                            onClick={() =>
                              runAction(async () => {
                                const result = await transferClientOwnership(row.id);
                                if (!("error" in result && result.error)) {
                                  await refreshRows();
                                }
                                return result as { error?: string } | { success: boolean };
                              })
                            }
                          >
                            Make Owner
                          </Button>
                        ) : null}
                        <Button
                          type="button"
                          variant="destructive"
                          size="sm"
                          disabled={saving || isSelf}
                          onClick={() =>
                            runAction(async () => {
                              const result = await deactivateClientTeamUser(row.id);
                              if (!("error" in result && result.error)) {
                                await refreshRows();
                              }
                              return result as { error?: string } | { success: boolean };
                            })
                          }
                        >
                          Deactivate
                        </Button>
                      </>
                    ) : (
                      <span className="text-xs text-muted-foreground">—</span>
                    )}
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>

      {message && <p className="text-sm text-emerald-700">{message}</p>}
      {error && <p className="text-sm text-red-600">{error}</p>}
    </div>
  );
}
