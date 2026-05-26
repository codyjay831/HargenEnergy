"use client";

import { useState, useTransition } from "react";
import { format } from "date-fns";
import { ClipboardList, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { PRODUCT_LANGUAGE } from "@/lib/product-language";
import type { ClientWalkthroughRequest } from "@/lib/portal-walkthrough";
import type { WalkthroughCatalogCategory } from "@/lib/walkthrough-catalog";
import { requestScopeChange } from "@/app/actions/portal";

interface YourWalkthroughRequestProps {
  walkthrough: ClientWalkthroughRequest;
  catalog: WalkthroughCatalogCategory[];
}

export function YourWalkthroughRequest({ walkthrough, catalog }: YourWalkthroughRequestProps) {
  const copy = PRODUCT_LANGUAGE.walkthroughRequest;
  const [sheetOpen, setSheetOpen] = useState(false);
  const [note, setNote] = useState("");
  const [selectedTaskIds, setSelectedTaskIds] = useState<string[]>(
    walkthrough.taskIds.length > 0 ? walkthrough.taskIds : [],
  );
  const [isPending, startTransition] = useTransition();

  const toggleTask = (taskId: string, checked: boolean) => {
    setSelectedTaskIds((prev) =>
      checked ? [...prev, taskId] : prev.filter((id) => id !== taskId),
    );
  };

  const handleSubmitScopeChange = () => {
    startTransition(async () => {
      const result = await requestScopeChange({
        note,
        requestedWorkTaskIds:
          selectedTaskIds.length > 0 ? selectedTaskIds : undefined,
      });

      if ("error" in result && result.error) {
        toast.error(result.error);
        return;
      }

      toast.success(copy.scopeChangeSuccess);
      setSheetOpen(false);
      setNote("");
    });
  };

  return (
    <>
      <Card className="border-sky-200 bg-sky-50/30">
        <CardHeader className="flex flex-row items-start justify-between gap-4 space-y-0">
          <div>
            <CardTitle className="flex items-center gap-2 text-lg">
              <ClipboardList className="h-5 w-5 text-sky-700" />
              {copy.title}
            </CardTitle>
            <p className="mt-1 text-sm text-muted-foreground">
              {copy.submittedLabel}{" "}
              {format(new Date(walkthrough.submittedAt), "MMMM d, yyyy 'at' h:mm a")}
            </p>
          </div>
          <Button variant="outline" size="sm" onClick={() => setSheetOpen(true)}>
            {copy.requestScopeChange}
          </Button>
        </CardHeader>
        <CardContent className="space-y-5">
          <div className="space-y-2">
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              {copy.supportAreas}
            </p>
            <div className="space-y-2">
              {walkthrough.tasks.map((task) => (
                <div key={task.id} className="rounded-md border bg-background px-3 py-2">
                  <p className="text-sm font-medium">{task.name}</p>
                  {task.description ? (
                    <p className="mt-1 text-xs text-muted-foreground">{task.description}</p>
                  ) : null}
                </div>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="md:col-span-1">
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                {copy.bottleneck}
              </p>
              <p className="mt-1 text-sm whitespace-pre-wrap">{walkthrough.bottleneck}</p>
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                {copy.planInterest}
              </p>
              <p className="mt-1 text-sm">{walkthrough.planLabel}</p>
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                {copy.urgency}
              </p>
              <p className="mt-1 text-sm">{walkthrough.urgencyLabel}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
        <SheetContent side="right" className="w-full sm:max-w-lg overflow-y-auto">
          <SheetHeader>
            <SheetTitle>{copy.scopeChangeTitle}</SheetTitle>
            <SheetDescription>{copy.scopeChangeDescription}</SheetDescription>
          </SheetHeader>

          <div className="mt-6 space-y-6">
            <div className="space-y-2">
              <Label htmlFor="scope-change-note">{copy.scopeChangeNote}</Label>
              <Textarea
                id="scope-change-note"
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="Describe what should be added, removed, or clarified..."
                className="min-h-[120px]"
              />
            </div>

            {catalog.length > 0 && (
              <div className="space-y-3">
                <Label>{copy.scopeChangeOptionalAreas}</Label>
                <div className="space-y-4 max-h-[320px] overflow-y-auto border rounded-md p-3">
                  {catalog.map((category) => (
                    <div key={category.id} className="space-y-2">
                      <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                        {category.name}
                      </p>
                      {category.tasks.map((task) => (
                        <div key={task.id} className="flex items-start gap-2">
                          <Checkbox
                            id={`scope-${task.id}`}
                            checked={selectedTaskIds.includes(task.id)}
                            onCheckedChange={(checked) => toggleTask(task.id, !!checked)}
                            className="mt-0.5"
                          />
                          <Label htmlFor={`scope-${task.id}`} className="font-normal text-sm leading-snug">
                            {task.name}
                          </Label>
                        </div>
                      ))}
                    </div>
                  ))}
                </div>
              </div>
            )}

            <Button
              className="w-full"
              onClick={handleSubmitScopeChange}
              disabled={isPending || !note.trim()}
            >
              {isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Sending...
                </>
              ) : (
                copy.scopeChangeSubmit
              )}
            </Button>
          </div>
        </SheetContent>
      </Sheet>
    </>
  );
}
