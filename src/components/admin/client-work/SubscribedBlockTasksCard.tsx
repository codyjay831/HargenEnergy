"use client";

import { useState } from "react";
import Link from "next/link";
import { formatDistanceToNow } from "date-fns";
import { ListChecks } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { adminClientTabHref } from "@/lib/admin-client-tabs";
import type { BlockWorkboardItem } from "@/lib/block-work";

type SubscribedBlockTasksCardProps = {
  clientId: string;
  items: BlockWorkboardItem[];
};

function BlockTasksList({ items }: { items: BlockWorkboardItem[] }) {
  return (
    <ul className="divide-y">
      {items.map((item) => (
        <li key={item.id} className="flex items-center justify-between gap-4 py-3">
          <div>
            <p className="text-sm font-medium">{item.task.name}</p>
            <p className="text-xs text-muted-foreground">{item.task.categoryName}</p>
          </div>
          <div className="shrink-0 text-right text-xs text-muted-foreground">
            <p>{item.priorityLabel}</p>
            <p>
              {item.lastVisibleUpdateAt
                ? formatDistanceToNow(new Date(item.lastVisibleUpdateAt), { addSuffix: true })
                : "No updates"}
            </p>
          </div>
        </li>
      ))}
    </ul>
  );
}

export function SubscribedBlockTasksCard({ clientId, items }: SubscribedBlockTasksCardProps) {
  const [sheetOpen, setSheetOpen] = useState(false);

  return (
    <>
      <Card>
        <CardHeader className="flex flex-row items-start justify-between gap-4 space-y-0 pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <ListChecks className="h-4 w-4 text-muted-foreground" />
            Subscribed block tasks
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-0">
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
            <div className="flex flex-wrap items-center justify-between gap-3">
              <p className="text-sm text-muted-foreground">
                {items.length} active block task{items.length === 1 ? "" : "s"}
              </p>
              <Button variant="outline" size="sm" onClick={() => setSheetOpen(true)}>
                View subscribed tasks
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
        <SheetContent side="right" className="w-full overflow-y-auto sm:max-w-lg">
          <SheetHeader>
            <SheetTitle>Subscribed block tasks</SheetTitle>
            <SheetDescription>
              {items.length} active block task{items.length === 1 ? "" : "s"} on this client&apos;s
              support block.
            </SheetDescription>
          </SheetHeader>
          <div className="mt-6">
            <BlockTasksList items={items} />
          </div>
        </SheetContent>
      </Sheet>
    </>
  );
}
