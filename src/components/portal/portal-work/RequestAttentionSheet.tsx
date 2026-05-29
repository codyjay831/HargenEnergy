"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Bell, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { nudgeBlockWorkItem } from "@/app/actions/block-work";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import type { BlockWorkTaskOption } from "@/lib/block-work";

type RequestAttentionSheetProps = {
  taskOptions: BlockWorkTaskOption[];
};

export function RequestAttentionSheet({ taskOptions }: RequestAttentionSheetProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [open, setOpen] = useState(false);
  const [blockWorkItemId, setBlockWorkItemId] = useState(taskOptions[0]?.blockWorkItemId ?? "");
  const [note, setNote] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!blockWorkItemId) {
      toast.error("Select a subscribed task.");
      return;
    }

    startTransition(async () => {
      const result = await nudgeBlockWorkItem({
        blockWorkItemId,
        note: note.trim() || undefined,
      });

      if ("error" in result) {
        toast.error(result.error);
        return;
      }

      toast.success("Your team has been notified.");
      setNote("");
      setOpen(false);
      router.refresh();
    });
  };

  if (taskOptions.length === 0) {
    return null;
  }

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger render={<Button variant="outline" size="sm" />}>
        <Bell className="h-4 w-4" />
        Request attention
      </SheetTrigger>
      <SheetContent side="right" className="overflow-y-auto sm:max-w-md">
        <SheetHeader>
          <SheetTitle>Request attention</SheetTitle>
          <SheetDescription>
            Nudge priority on a subscribed block task without creating a priced request.
          </SheetDescription>
        </SheetHeader>
        <form onSubmit={handleSubmit} className="space-y-4 px-4 pb-6">
          <div className="space-y-2">
            <Label htmlFor="nudge-task">Subscribed task</Label>
            <Select value={blockWorkItemId} onValueChange={setBlockWorkItemId}>
              <SelectTrigger id="nudge-task">
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
            <Label htmlFor="nudge-note">Note (optional)</Label>
            <Textarea
              id="nudge-note"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="What should we prioritize this week?"
              className="min-h-[100px]"
            />
          </div>
          <Button type="submit" className="w-full" disabled={isPending}>
            {isPending ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Sending...
              </>
            ) : (
              "Send nudge"
            )}
          </Button>
        </form>
      </SheetContent>
    </Sheet>
  );
}
