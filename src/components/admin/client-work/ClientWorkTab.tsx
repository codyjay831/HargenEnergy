import Link from "next/link";
import { format, formatDistanceToNow } from "date-fns";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { adminClientTabHref } from "@/lib/admin-client-tabs";
import type { BlockWorkTimelineEntry, BlockWorkboardItem } from "@/lib/block-work";
import { PRODUCT_LANGUAGE } from "@/lib/product-language";

type ClientWorkRequest = {
  id: string;
  title: string;
  status: string;
  createdAt: Date;
  supportNeeded: string | null;
};

type ClientWorkTabProps = {
  clientId: string;
  items: BlockWorkboardItem[];
  timeline: BlockWorkTimelineEntry[];
  requests: ClientWorkRequest[];
};

function activityTypeLabel(type: string): string {
  switch (type) {
    case "CLIENT_NUDGE":
      return "Client nudge";
    case "ADMIN_UPDATE":
    case "PROGRESS_LOG":
      return "Update";
    case "CONVERTED_TO_REQUEST":
      return "Escalated";
    default:
      return "Note";
  }
}

export function ClientWorkTab({ clientId, items, timeline, requests }: ClientWorkTabProps) {
  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Activity</CardTitle>
        </CardHeader>
        <CardContent>
          {timeline.length === 0 ? (
            <p className="text-sm text-muted-foreground py-4 text-center">
              No block work updates yet. Use Log proof of work in the header.
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
                      {!entry.visibleToClient && (
                        <Badge variant="secondary" className="text-[10px]">
                          Internal
                        </Badge>
                      )}
                    </div>
                    <span className="text-xs text-muted-foreground">
                      {formatDistanceToNow(new Date(entry.createdAt), { addSuffix: true })}
                    </span>
                  </div>
                  {entry.title && (
                    <p className="text-xs text-muted-foreground mt-1">{entry.title}</p>
                  )}
                  <p className="text-sm text-slate-700 whitespace-pre-wrap mt-2">{entry.body}</p>
                  <p className="text-xs text-muted-foreground mt-1">{entry.authorName}</p>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Subscribed block tasks</CardTitle>
        </CardHeader>
        <CardContent>
          {items.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No active block tasks. Configure approved work in{" "}
              <Link
                href={adminClientTabHref(clientId, "setup")}
                className="text-primary underline underline-offset-2"
              >
                Setup & access
              </Link>
              .
            </p>
          ) : (
            <ul className="divide-y">
              {items.map((item) => (
                <li key={item.id} className="flex items-center justify-between py-3 gap-4">
                  <div>
                    <p className="text-sm font-medium">{item.task.name}</p>
                    <p className="text-xs text-muted-foreground">{item.task.categoryName}</p>
                  </div>
                  <div className="text-right text-xs text-muted-foreground shrink-0">
                    <p>{item.priorityLabel}</p>
                    <p>
                      {item.lastVisibleUpdateAt
                        ? formatDistanceToNow(new Date(item.lastVisibleUpdateAt), {
                            addSuffix: true,
                          })
                        : "No updates"}
                    </p>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-base">
            {PRODUCT_LANGUAGE.workRequest.plural} (priced path)
          </CardTitle>
          <Link
            href={`/admin/requests?clientId=${clientId}`}
            className="text-xs text-primary hover:underline font-medium"
          >
            View all
          </Link>
        </CardHeader>
        <CardContent>
          {requests.length === 0 ? (
            <p className="text-sm text-muted-foreground py-4 text-center">
              No work requests yet.
            </p>
          ) : (
            <div className="space-y-3">
              {requests.map((request) => (
                <Link
                  key={request.id}
                  href={`/admin/requests/${request.id}`}
                  className="flex items-center justify-between p-3 border rounded-lg hover:bg-slate-50 transition-colors"
                >
                  <div>
                    <p className="font-medium text-sm">{request.title}</p>
                    <p className="text-xs text-muted-foreground">
                      {format(new Date(request.createdAt), "MMM d, yyyy")} •{" "}
                      {request.status.replace(/_/g, " ").toLowerCase()}
                    </p>
                  </div>
                  <span className="text-primary text-sm">Open →</span>
                </Link>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
