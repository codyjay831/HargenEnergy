"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { addBlockWorkUpdate } from "@/app/actions/block-work";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { BlockWorkTaskOption } from "@/lib/block-work";

type ProofOfWorkFormProps = {
  taskOptions: BlockWorkTaskOption[];
  onSuccess?: () => void;
};

export function ProofOfWorkForm({ taskOptions, onSuccess }: ProofOfWorkFormProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [blockWorkItemId, setBlockWorkItemId] = useState(taskOptions[0]?.blockWorkItemId ?? "");
  const [body, setBody] = useState("");
  const [completedCount, setCompletedCount] = useState("");
  const [pendingCount, setPendingCount] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!blockWorkItemId) {
      toast.error("Select a subscribed task.");
      return;
    }
    if (!body.trim()) {
      toast.error("Describe what you completed.");
      return;
    }

    const parsedCompleted =
      completedCount.trim().length > 0 ? Number.parseInt(completedCount, 10) : null;
    const parsedPending =
      pendingCount.trim().length > 0 ? Number.parseInt(pendingCount, 10) : null;

    startTransition(async () => {
      const result = await addBlockWorkUpdate({
        blockWorkItemId,
        title: "Proof of work",
        body: body.trim(),
        completedCount:
          Number.isFinite(parsedCompleted as number) && (parsedCompleted as number) >= 0
            ? parsedCompleted
            : null,
        pendingCount:
          Number.isFinite(parsedPending as number) && (parsedPending as number) >= 0
            ? parsedPending
            : null,
        visibleToClient: true,
      });

      if ("error" in result) {
        toast.error(result.error);
        return;
      }

      toast.success("Proof of work logged.");
      setBody("");
      setCompletedCount("");
      setPendingCount("");
      router.refresh();
      onSuccess?.();
    });
  };

  if (taskOptions.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        No active block tasks. Add approved work in Setup & access first.
      </p>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="proof-task">Subscribed task</Label>
        <Select value={blockWorkItemId} onValueChange={setBlockWorkItemId}>
          <SelectTrigger id="proof-task">
            <SelectValue placeholder="Select task" />
          </SelectTrigger>
          <SelectContent>
            {taskOptions.map((task) => (
              <SelectItem key={task.blockWorkItemId} value={task.blockWorkItemId}>
                {`${task.name} — ${task.categoryName}`}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <Label htmlFor="proof-body">What did you complete?</Label>
        <Textarea
          id="proof-body"
          value={body}
          onChange={(e) => setBody(e.target.value)}
          placeholder="e.g. Processed 5 leads, scheduled 10 site visits, updated AHJ portal login."
          className="min-h-[120px]"
          required
        />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-2">
          <Label htmlFor="proof-completed">Completed (optional)</Label>
          <Input
            id="proof-completed"
            type="number"
            min={0}
            value={completedCount}
            onChange={(e) => setCompletedCount(e.target.value)}
            placeholder="e.g. 5"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="proof-pending">Still pending (optional)</Label>
          <Input
            id="proof-pending"
            type="number"
            min={0}
            value={pendingCount}
            onChange={(e) => setPendingCount(e.target.value)}
            placeholder="e.g. 3"
          />
        </div>
      </div>

      <Button type="submit" className="w-full" disabled={isPending}>
        {isPending ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Saving...
          </>
        ) : (
          "Continue"
        )}
      </Button>
    </form>
  );
}
