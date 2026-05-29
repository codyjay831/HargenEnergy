"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { formatDistanceToNow } from "date-fns";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  addBlockWorkUpdate,
  archiveOrPauseBlockWorkItem,
  convertBlockWorkItemToRequest,
  setBlockWorkPriority,
} from "@/app/actions/block-work";
import type { BlockWorkboardItem } from "@/lib/block-work";
import { URGENCY_OPTIONS } from "@/lib/ui-enums";

type AdminBlockWorkboardClientProps = {
  items: BlockWorkboardItem[];
};

export function AdminBlockWorkboardClient({ items }: AdminBlockWorkboardClientProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [updates, setUpdates] = useState<Record<string, string>>({});
  const [completedCounts, setCompletedCounts] = useState<Record<string, string>>({});
  const [pendingCounts, setPendingCounts] = useState<Record<string, string>>({});
  const [convertTitle, setConvertTitle] = useState<Record<string, string>>({});
  const [convertDescription, setConvertDescription] = useState<Record<string, string>>({});
  const [convertUrgency, setConvertUrgency] = useState<Record<string, string>>({});

  const runAction = (action: () => Promise<void>) => {
    startTransition(async () => {
      await action();
      router.refresh();
    });
  };

  if (items.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>No active block work items</CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground">
          Approved support block tasks will appear here once enabled for clients.
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {items.map((item) => (
        <Card key={item.id}>
          <CardHeader className="space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <CardTitle className="text-base">
                  {item.client?.companyName || "Unknown Client"} - {item.task.name}
                </CardTitle>
                <p className="text-xs text-muted-foreground mt-1">{item.task.categoryName}</p>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant="secondary">{item.priorityLabel}</Badge>
                <Badge variant={item.state === "PAUSED" ? "outline" : "default"}>{item.state}</Badge>
              </div>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs">
              <div>
                <p className="text-muted-foreground">Pending</p>
                <p className="font-semibold">{item.pendingCount ?? "—"}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Completed</p>
                <p className="font-semibold">{item.completedCount ?? "—"}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Last client nudge</p>
                <p className="font-semibold">
                  {item.lastClientNudgeAt
                    ? formatDistanceToNow(new Date(item.lastClientNudgeAt), { addSuffix: true })
                    : "Never"}
                </p>
              </div>
              <div>
                <p className="text-muted-foreground">Last admin update</p>
                <p className="font-semibold">
                  {item.lastAdminUpdateAt
                    ? formatDistanceToNow(new Date(item.lastAdminUpdateAt), { addSuffix: true })
                    : "None"}
                </p>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              {[1, 2, 3, 4, 5].map((priority) => (
                <Button
                  key={priority}
                  type="button"
                  variant={item.currentPriorityRank === priority ? "default" : "outline"}
                  disabled={isPending}
                  onClick={() =>
                    runAction(async () => {
                      const result = await setBlockWorkPriority({
                        blockWorkItemId: item.id,
                        priorityRank: priority,
                      });
                      if ("error" in result) {
                        toast.error(result.error);
                        return;
                      }
                      toast.success(`Priority set to P${result.priorityRank}.`);
                    })
                  }
                >
                  Set P{priority}
                </Button>
              ))}
              <Button
                type="button"
                variant="outline"
                disabled={isPending}
                onClick={() =>
                  runAction(async () => {
                    const result = await archiveOrPauseBlockWorkItem({
                      blockWorkItemId: item.id,
                      state: item.state === "PAUSED" ? "ACTIVE" : "PAUSED",
                    });
                    if ("error" in result) {
                      toast.error(result.error);
                      return;
                    }
                    toast.success(item.state === "PAUSED" ? "Item resumed." : "Item paused.");
                  })
                }
              >
                {item.state === "PAUSED" ? "Resume" : "Pause"}
              </Button>
              <Button
                type="button"
                variant="destructive"
                disabled={isPending}
                onClick={() =>
                  runAction(async () => {
                    const result = await archiveOrPauseBlockWorkItem({
                      blockWorkItemId: item.id,
                      state: "ARCHIVED",
                    });
                    if ("error" in result) {
                      toast.error(result.error);
                      return;
                    }
                    toast.success("Item archived.");
                  })
                }
              >
                Archive
              </Button>
            </div>

            <div className="space-y-3 rounded-md border p-3">
              <Label className="text-xs uppercase tracking-wider text-muted-foreground">
                Add Tasks Complete Update
              </Label>
              <Textarea
                placeholder="What did you complete?"
                value={updates[item.id] ?? ""}
                onChange={(event) =>
                  setUpdates((prev) => ({ ...prev, [item.id]: event.target.value }))
                }
                className="min-h-[80px]"
              />
              <div className="grid grid-cols-2 gap-3">
                <Input
                  type="number"
                  min={0}
                  placeholder="Completed count"
                  value={completedCounts[item.id] ?? ""}
                  onChange={(event) =>
                    setCompletedCounts((prev) => ({ ...prev, [item.id]: event.target.value }))
                  }
                />
                <Input
                  type="number"
                  min={0}
                  placeholder="Pending count"
                  value={pendingCounts[item.id] ?? ""}
                  onChange={(event) =>
                    setPendingCounts((prev) => ({ ...prev, [item.id]: event.target.value }))
                  }
                />
              </div>
              <Button
                type="button"
                disabled={isPending}
                onClick={() =>
                  runAction(async () => {
                    const body = updates[item.id]?.trim();
                    if (!body) {
                      toast.error("Update details are required.");
                      return;
                    }
                    const completedCount =
                      completedCounts[item.id] && completedCounts[item.id].length > 0
                        ? Number.parseInt(completedCounts[item.id], 10)
                        : null;
                    const pendingCount =
                      pendingCounts[item.id] && pendingCounts[item.id].length > 0
                        ? Number.parseInt(pendingCounts[item.id], 10)
                        : null;

                    const result = await addBlockWorkUpdate({
                      blockWorkItemId: item.id,
                      title: "Tasks completed update",
                      body,
                      completedCount:
                        Number.isFinite(completedCount as number) && (completedCount as number) >= 0
                          ? completedCount
                          : null,
                      pendingCount:
                        Number.isFinite(pendingCount as number) && (pendingCount as number) >= 0
                          ? pendingCount
                          : null,
                      visibleToClient: true,
                    });
                    if ("error" in result) {
                      toast.error(result.error);
                      return;
                    }
                    toast.success("Block work update posted.");
                    setUpdates((prev) => ({ ...prev, [item.id]: "" }));
                    setCompletedCounts((prev) => ({ ...prev, [item.id]: "" }));
                    setPendingCounts((prev) => ({ ...prev, [item.id]: "" }));
                  })
                }
              >
                {isPending ? "Saving..." : "Post Update"}
              </Button>
            </div>

            <div className="space-y-3 rounded-md border p-3">
              <Label className="text-xs uppercase tracking-wider text-muted-foreground">
                Escalate to Priced Request
              </Label>
              <Input
                placeholder="Request title"
                value={convertTitle[item.id] ?? ""}
                onChange={(event) =>
                  setConvertTitle((prev) => ({ ...prev, [item.id]: event.target.value }))
                }
              />
              <Textarea
                placeholder="Describe scope for priced request"
                value={convertDescription[item.id] ?? ""}
                onChange={(event) =>
                  setConvertDescription((prev) => ({ ...prev, [item.id]: event.target.value }))
                }
                className="min-h-[80px]"
              />
              <select
                className="h-10 w-full rounded-md border bg-background px-3 text-sm"
                value={convertUrgency[item.id] ?? "NORMAL"}
                onChange={(event) =>
                  setConvertUrgency((prev) => ({ ...prev, [item.id]: event.target.value }))
                }
              >
                {URGENCY_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
              <Button
                type="button"
                variant="outline"
                disabled={isPending}
                onClick={() =>
                  runAction(async () => {
                    const result = await convertBlockWorkItemToRequest({
                      blockWorkItemId: item.id,
                      title:
                        convertTitle[item.id]?.trim() ||
                        `Escalated request: ${item.task.name}`,
                      description:
                        convertDescription[item.id]?.trim() ||
                        "Escalated from block work for priced request handling.",
                      urgency: convertUrgency[item.id] ?? "NORMAL",
                    });
                    if ("error" in result) {
                      toast.error(result.error);
                      return;
                    }
                    toast.success(`Created request ${result.requestId}.`);
                  })
                }
              >
                Convert to Priced Request
              </Button>
            </div>

            <div className="space-y-2">
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Activity
              </p>
              {item.activities.length === 0 ? (
                <p className="text-sm text-muted-foreground">No activity yet.</p>
              ) : (
                <div className="space-y-2">
                  {item.activities.map((activity) => (
                    <div key={activity.id} className="rounded-md border p-3">
                      <div className="flex items-center justify-between gap-2">
                        <p className="text-sm font-medium">
                          {activity.title || "Update"} - {activity.authorName}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {formatDistanceToNow(new Date(activity.createdAt), { addSuffix: true })}
                        </p>
                      </div>
                      <p className="text-sm text-muted-foreground whitespace-pre-wrap mt-1">
                        {activity.body}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
