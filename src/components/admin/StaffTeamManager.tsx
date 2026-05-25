"use client";

import { useMemo, useState } from "react";
import { Loader2 } from "lucide-react";
import {
  changeStaffRole,
  deactivateStaffUser,
  inviteStaffUser,
  listStaffUsers,
  resendStaffInvite,
} from "@/app/actions/staff-users";
import { StaffRole } from "@/generated/prisma/client";
import { Badge } from "@/components/ui/badge";
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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

type StaffRow = Awaited<ReturnType<typeof listStaffUsers>>["users"][number];

export function StaffTeamManager(props: {
  currentUserId: string;
  rows: StaffRow[];
  canManage: boolean;
}) {
  const [rows, setRows] = useState(props.rows);
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const ownerCount = useMemo(
    () => rows.filter((r) => r.staffRole === StaffRole.OWNER && !r.deactivatedAt).length,
    [rows],
  );

  async function refreshRows() {
    const latest = await listStaffUsers();
    setRows(latest.users);
  }

  async function handleInvite() {
    setSaving(true);
    setMessage(null);
    setError(null);
    try {
      const result = await inviteStaffUser({ email, name, staffRole: StaffRole.MEMBER });
      if ("error" in result && result.error) setError(result.error);
      else {
        setMessage("Staff invite sent.");
        setEmail("");
        setName("");
        await refreshRows();
      }
    } finally {
      setSaving(false);
    }
  }

  async function handleResend(userId: string) {
    setSaving(true);
    setMessage(null);
    setError(null);
    try {
      const result = await resendStaffInvite(userId);
      if ("error" in result && result.error) setError(result.error);
      else setMessage("Invite resent.");
    } finally {
      setSaving(false);
    }
  }

  async function handleDeactivate(userId: string) {
    setSaving(true);
    setMessage(null);
    setError(null);
    try {
      const result = await deactivateStaffUser(userId);
      if ("error" in result && result.error) setError(result.error);
      else {
        setMessage("Team member deactivated.");
        await refreshRows();
      }
    } finally {
      setSaving(false);
    }
  }

  async function handleRoleChange(userId: string, role: StaffRole) {
    setSaving(true);
    setMessage(null);
    setError(null);
    try {
      const result = await changeStaffRole(userId, role);
      if ("error" in result && result.error) setError(result.error);
      else {
        setMessage("Role updated.");
        await refreshRows();
      }
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className="rounded-md border p-4 space-y-4">
        <h3 className="font-semibold">Invite Staff Member</h3>
        <p className="text-sm text-muted-foreground">
          Keep this simple: invite staff as Team Member. Owner rights are managed separately.
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
              onClick={handleInvite}
              disabled={!props.canManage || saving || !email.trim()}
              className="w-full"
            >
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              <span className="ml-2">Send Invite</span>
            </Button>
          </div>
        </div>
      </div>

      <div className="rounded-md border p-4">
        <div className="mb-3 text-sm text-muted-foreground">
          Active Owners: {ownerCount}
        </div>
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
              const isSelf = row.id === props.currentUserId;
              const isDeactivated = !!row.deactivatedAt;
              const role = row.staffRole ?? StaffRole.OWNER;
              return (
                <TableRow key={row.id}>
                  <TableCell>{row.name || "—"}</TableCell>
                  <TableCell>{row.email}</TableCell>
                  <TableCell>
                    {props.canManage && !isDeactivated ? (
                      <Select
                        value={role}
                        onValueChange={(v) => handleRoleChange(row.id, v as StaffRole)}
                        disabled={saving}
                      >
                        <SelectTrigger className="w-36">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value={StaffRole.OWNER}>Owner</SelectItem>
                          <SelectItem value={StaffRole.MEMBER}>Team Member</SelectItem>
                        </SelectContent>
                      </Select>
                    ) : (
                      <Badge variant="outline">{role === StaffRole.OWNER ? "Owner" : "Team Member"}</Badge>
                    )}
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
                          onClick={() => handleResend(row.id)}
                          disabled={saving}
                        >
                          Resend
                        </Button>
                        <Button
                          type="button"
                          variant="destructive"
                          size="sm"
                          onClick={() => handleDeactivate(row.id)}
                          disabled={saving || isSelf}
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
