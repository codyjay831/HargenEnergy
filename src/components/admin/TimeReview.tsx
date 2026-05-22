"use client";

import { useState, useTransition } from "react";
import { confirmTimeEntry, deleteTimeEntry, updateTimeEntry } from "@/app/actions/time";
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { format } from "date-fns";
import { Check, Trash2, Edit2, Loader2, AlertCircle } from "lucide-react";
import { toast } from "sonner";
import Link from "next/link";
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogFooter 
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

interface TimeEntry {
  id: string;
  date: Date;
  minutes: number;
  description: string;
  billableType: string;
  status: string;
  clientId: string;
  client: { companyName: string };
  supportRequestId: string | null;
  supportRequest: { title: string } | null;
}

interface TimeReviewProps {
  entries: TimeEntry[];
}

export function TimeReview({ entries }: TimeReviewProps) {
  const [isPending, startTransition] = useTransition();
  const [editingEntry, setEditingEntry] = useState<TimeEntry | null>(null);
  const [editMinutes, setEditMinutes] = useState("");
  const [editDescription, setEditDescription] = useState("");

  const handleConfirm = (id: string) => {
    startTransition(async () => {
      try {
        await confirmTimeEntry(id);
        toast.success("Time entry confirmed");
      } catch {
        toast.error("Failed to confirm time entry");
      }
    });
  };

  const handleDelete = (id: string) => {
    if (!confirm("Are you sure you want to delete this time entry?")) return;
    startTransition(async () => {
      try {
        await deleteTimeEntry(id);
        toast.success("Time entry deleted");
      } catch {
        toast.error("Failed to delete time entry");
      }
    });
  };

  const handleEdit = (entry: TimeEntry) => {
    setEditingEntry(entry);
    setEditMinutes(entry.minutes.toString());
    setEditDescription(entry.description);
  };

  const saveEdit = () => {
    if (!editingEntry) return;
    startTransition(async () => {
      try {
        await updateTimeEntry(editingEntry.id, {
          minutes: parseInt(editMinutes),
          description: editDescription,
        });
        setEditingEntry(null);
        toast.success("Time entry updated");
      } catch {
        toast.error("Failed to update time entry");
      }
    });
  };

  const stagedEntries = entries.filter(e => e.status === "STAGED");
  const confirmedEntries = entries.filter(e => e.status === "CONFIRMED");

  return (
    <div className="space-y-8">
      {stagedEntries.length > 0 && (
        <div className="space-y-4">
          <div className="flex items-center gap-2 text-amber-600">
            <AlertCircle className="h-5 w-5" />
            <h2 className="text-lg font-bold">Staged Entries for Review</h2>
          </div>
          <div className="bg-amber-50/50 border border-amber-100 rounded-lg overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow className="bg-amber-100/50">
                  <TableHead>Date</TableHead>
                  <TableHead>Client / Request</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead className="text-right">Minutes</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {stagedEntries.map((entry) => (
                  <TableRow key={entry.id}>
                    <TableCell className="text-sm">
                      {format(new Date(entry.date), "MMM d")}
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-col">
                        <span className="font-medium text-sm">{entry.client.companyName}</span>
                        {entry.supportRequest && (
                          <Link href={`/admin/requests/${entry.supportRequestId}`} className="text-[10px] text-primary hover:underline truncate max-w-[150px]">
                            {entry.supportRequest.title}
                          </Link>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="text-sm italic">
                      {entry.description}
                    </TableCell>
                    <TableCell className="text-right font-bold">
                      {entry.minutes}m
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1">
                        <Button size="icon" variant="ghost" className="h-8 w-8 text-green-600" onClick={() => handleConfirm(entry.id)} disabled={isPending}>
                          <Check className="h-4 w-4" />
                        </Button>
                        <Button size="icon" variant="ghost" className="h-8 w-8 text-blue-600" onClick={() => handleEdit(entry)} disabled={isPending}>
                          <Edit2 className="h-4 w-4" />
                        </Button>
                        <Button size="icon" variant="ghost" className="h-8 w-8 text-red-600" onClick={() => handleDelete(entry.id)} disabled={isPending}>
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </div>
      )}

      <div className="space-y-4">
        <h2 className="text-lg font-bold">Confirmed Time Entries</h2>
        <div className="bg-white border rounded-lg overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Client</TableHead>
                <TableHead>Request</TableHead>
                <TableHead>Description</TableHead>
                <TableHead className="text-right">Minutes</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {confirmedEntries.map((entry) => (
                <TableRow key={entry.id}>
                  <TableCell className="text-sm">
                    {format(new Date(entry.date), "MMM d, yyyy")}
                  </TableCell>
                  <TableCell className="text-sm font-medium">
                    {entry.client.companyName}
                  </TableCell>
                  <TableCell>
                    {entry.supportRequest ? (
                      <Link href={`/admin/requests/${entry.supportRequestId}`} className="text-xs text-primary hover:underline">
                        {entry.supportRequest.title}
                      </Link>
                    ) : (
                      <span className="text-xs text-muted-foreground italic">General</span>
                    )}
                  </TableCell>
                  <TableCell className="text-sm truncate max-w-[200px]">
                    {entry.description}
                  </TableCell>
                  <TableCell className="text-right font-bold">
                    {entry.minutes}m
                  </TableCell>
                  <TableCell className="text-right">
                    <Button size="icon" variant="ghost" className="h-8 w-8 text-red-600" onClick={() => handleDelete(entry.id)} disabled={isPending}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </div>

      <Dialog open={!!editingEntry} onOpenChange={(open) => !open && setEditingEntry(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Time Entry</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="minutes">Minutes</Label>
              <Input 
                id="minutes" 
                type="number" 
                value={editMinutes}
                onChange={(e) => setEditMinutes(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea 
                id="description" 
                value={editDescription}
                onChange={(e) => setEditDescription(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setEditingEntry(null)}>Cancel</Button>
            <Button onClick={saveEdit} disabled={isPending}>
              {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
