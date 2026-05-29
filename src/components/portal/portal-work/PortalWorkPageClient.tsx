"use client";

import { formatDistanceToNow } from "date-fns";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { RequestAttentionSheet } from "@/components/portal/portal-work/RequestAttentionSheet";
import type { BlockWorkTaskOption, BlockWorkTimelineEntry } from "@/lib/block-work";
import { PRODUCT_LANGUAGE } from "@/lib/product-language";

type PortalWorkPageClientProps = {
  timeline: BlockWorkTimelineEntry[];
  taskOptions: BlockWorkTaskOption[];
};

function activityTypeLabel(type: string): string {
  switch (type) {
    case "CLIENT_NUDGE":
      return "Your nudge";
    case "ADMIN_UPDATE":
    case "PROGRESS_LOG":
      return "Update from Hargen";
    default:
      return "Note";
  }
}

export function PortalWorkPageClient({ timeline, taskOptions }: PortalWorkPageClientProps) {
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold">{PRODUCT_LANGUAGE.updatesFromHargen}</h2>
          <p className="text-sm text-muted-foreground">
            Proof of work and progress on your subscribed support block tasks.
          </p>
        </div>
        <RequestAttentionSheet taskOptions={taskOptions} />
      </div>

      <Card>
        <CardContent className="pt-6">
          {timeline.length === 0 ? (
            <p className="text-sm text-muted-foreground py-6 text-center">
              No updates yet. Use Request attention to nudge your team on a subscribed task.
            </p>
          ) : (
            <div className="space-y-3">
              {timeline.map((entry) => (
                <div key={entry.id} className="rounded-lg border p-3">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-sm font-medium">{entry.taskName}</span>
                      <Badge variant="outline" className="text-[10px]">
                        {activityTypeLabel(entry.activityType)}
                      </Badge>
                    </div>
                    <span className="text-xs text-muted-foreground">
                      {formatDistanceToNow(new Date(entry.createdAt), { addSuffix: true })}
                    </span>
                  </div>
                  {entry.title && (
                    <p className="text-xs text-muted-foreground mt-1">{entry.title}</p>
                  )}
                  <p className="text-sm text-slate-700 whitespace-pre-wrap mt-2">{entry.body}</p>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {taskOptions.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Your subscribed block tasks</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="divide-y text-sm">
              {taskOptions.map((task) => (
                <li key={task.blockWorkItemId} className="py-2">
                  <p className="font-medium">{task.name}</p>
                  <p className="text-xs text-muted-foreground">{task.categoryName}</p>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
