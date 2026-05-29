"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { formatDistanceToNow } from "date-fns";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { nudgeBlockWorkItem } from "@/app/actions/block-work";
import type { BlockWorkboardItem } from "@/lib/block-work";

type PortalBlockWorkboardClientProps = {
  items: BlockWorkboardItem[];
};

export function PortalBlockWorkboardClient({ items }: PortalBlockWorkboardClientProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [notesByItem, setNotesByItem] = useState<Record<string, string>>({});
  const [volumeByItem, setVolumeByItem] = useState<Record<string, string>>({});
  const [windowByItem, setWindowByItem] = useState<Record<string, string>>({});

  const handleNudge = (itemId: string) => {
    const note = notesByItem[itemId]?.trim();
    const volumeRaw = volumeByItem[itemId];
    const desiredWindow = windowByItem[itemId]?.trim();
    const parsedVolume =
      volumeRaw && volumeRaw.trim().length > 0 ? Number.parseInt(volumeRaw, 10) : null;

    startTransition(async () => {
      const result = await nudgeBlockWorkItem({
        blockWorkItemId: itemId,
        note: note || undefined,
        volumeHint:
          Number.isFinite(parsedVolume as number) && (parsedVolume as number) >= 0
            ? parsedVolume
            : null,
        desiredWindow: desiredWindow || undefined,
      });

      if ("error" in result) {
        toast.error(result.error);
        return;
      }

      toast.success(`Priority nudged. New priority: P${result.priorityRank}.`);
      setNotesByItem((prev) => ({ ...prev, [itemId]: "" }));
      setVolumeByItem((prev) => ({ ...prev, [itemId]: "" }));
      setWindowByItem((prev) => ({ ...prev, [itemId]: "" }));
      router.refresh();
    });
  };

  if (items.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>No active block tasks</CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground">
          Your account manager has not enabled block work tasks yet.
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
                <CardTitle className="text-base">{item.task.name}</CardTitle>
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
                <p className="text-muted-foreground">Last update</p>
                <p className="font-semibold">
                  {item.lastVisibleUpdateAt
                    ? formatDistanceToNow(new Date(item.lastVisibleUpdateAt), { addSuffix: true })
                    : "No updates yet"}
                </p>
              </div>
              <div>
                <p className="text-muted-foreground">Last nudge</p>
                <p className="font-semibold">
                  {item.lastClientNudgeAt
                    ? formatDistanceToNow(new Date(item.lastClientNudgeAt), { addSuffix: true })
                    : "Never"}
                </p>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Request Attention
              </p>
              <Textarea
                value={notesByItem[item.id] ?? ""}
                onChange={(event) =>
                  setNotesByItem((prev) => ({ ...prev, [item.id]: event.target.value }))
                }
                placeholder="What changed? e.g. 5 new leads came in today."
                className="min-h-[72px]"
                disabled={isPending || item.state !== "ACTIVE"}
              />
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <Input
                  type="number"
                  min={0}
                  value={volumeByItem[item.id] ?? ""}
                  onChange={(event) =>
                    setVolumeByItem((prev) => ({ ...prev, [item.id]: event.target.value }))
                  }
                  placeholder="Volume hint (optional)"
                  disabled={isPending || item.state !== "ACTIVE"}
                />
                <Input
                  value={windowByItem[item.id] ?? ""}
                  onChange={(event) =>
                    setWindowByItem((prev) => ({ ...prev, [item.id]: event.target.value }))
                  }
                  placeholder="Desired window (optional)"
                  disabled={isPending || item.state !== "ACTIVE"}
                />
              </div>
              <Button
                type="button"
                onClick={() => handleNudge(item.id)}
                disabled={isPending || item.state !== "ACTIVE"}
              >
                {isPending ? "Sending..." : "Request Attention"}
              </Button>
            </div>

            <div className="space-y-2 border-t pt-4">
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Activity
              </p>
              {item.activities.length === 0 ? (
                <p className="text-sm text-muted-foreground">No activity yet.</p>
              ) : (
                <div className="space-y-3">
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
