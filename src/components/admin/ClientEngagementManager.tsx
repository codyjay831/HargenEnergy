"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { applyIntakeToApprovedWork, updateClientEngagement } from "@/app/actions/clients";
import { EngagementType } from "@/generated/prisma/client";
import { PRODUCT_LANGUAGE } from "@/lib/product-language";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";

type Category = {
  id: string;
  name: string;
  tasks: { id: string; name: string }[];
};

interface ClientEngagementManagerProps {
  clientId: string;
  engagementType: EngagementType;
  approvedWorkTaskIds: string[];
  suggestedWorkTaskIds?: string[];
  categories: Category[];
  walkthroughPlanRequestBased?: boolean;
}

export function ClientEngagementManager({
  clientId,
  engagementType: initialEngagement,
  approvedWorkTaskIds: initialApproved,
  suggestedWorkTaskIds = [],
  categories,
  walkthroughPlanRequestBased,
}: ClientEngagementManagerProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [isApplying, startApplyTransition] = useTransition();
  const [engagementType, setEngagementType] = useState<EngagementType>(
    walkthroughPlanRequestBased && initialEngagement === EngagementType.SUPPORT_BLOCK
      ? EngagementType.REQUEST_BASED
      : initialEngagement,
  );

  const initialApprovedSet = useMemo(
    () => new Set(initialApproved),
    [initialApproved],
  );
  const suggestedSet = useMemo(
    () => new Set(suggestedWorkTaskIds),
    [suggestedWorkTaskIds],
  );

  const [approved, setApproved] = useState<Set<string>>(() => {
    const next = new Set(initialApproved);
    for (const id of suggestedWorkTaskIds) {
      next.add(id);
    }
    return next;
  });

  const pendingFromIntake = suggestedWorkTaskIds.filter(
    (id) => !initialApprovedSet.has(id),
  );
  const intakeAppliedCount = suggestedWorkTaskIds.filter((id) =>
    initialApprovedSet.has(id),
  ).length;
  const intakeFullyApplied =
    suggestedWorkTaskIds.length > 0 &&
    suggestedWorkTaskIds.every((id) => initialApprovedSet.has(id));
  const configuredManuallyWithoutIntake =
    suggestedWorkTaskIds.length > 0 &&
    intakeAppliedCount === 0 &&
    initialApproved.length > 0;
  const hasUnsavedIntakeSuggestions = pendingFromIntake.some((id) => approved.has(id));

  const toggleApproved = (taskId: string, checked: boolean) => {
    setApproved((prev) => {
      const next = new Set(prev);
      if (checked) next.add(taskId);
      else next.delete(taskId);
      return next;
    });
  };

  const handleSave = () => {
    startTransition(async () => {
      try {
        const result = await updateClientEngagement({
          clientId,
          engagementType,
          approvedWorkTaskIds:
            engagementType === EngagementType.SUPPORT_BLOCK
              ? Array.from(approved)
              : [],
        });

        if ("error" in result && result.error) {
          toast.error(result.error);
          return;
        }

        toast.success("Engagement settings saved");
        if (result.warnings?.length) {
          result.warnings.forEach((w) => toast.warning(w));
        }
        router.refresh();
      } catch {
        toast.error("Failed to save engagement settings");
      }
    });
  };

  const handleApplyIntake = () => {
    startApplyTransition(async () => {
      try {
        const result = await applyIntakeToApprovedWork(clientId);
        if ("error" in result && result.error) {
          toast.error(result.error);
          return;
        }

        toast.success(
          (result.appliedCount ?? 0) > 0
            ? `Applied ${result.appliedCount} walkthrough selection${result.appliedCount === 1 ? "" : "s"}`
            : "Walkthrough selections were already applied",
        );
        router.refresh();
      } catch {
        toast.error("Failed to apply walkthrough selections");
      }
    });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-md">Engagement & approved work</CardTitle>
        <p className="text-sm text-muted-foreground">
          Engagement type controls how the client buys help. Support Block clients buy reserved
          support time inside approved work types. Request-Based clients send individual work
          requests that are reviewed and priced per request.
        </p>
      </CardHeader>
      <CardContent className="space-y-6">
        {walkthroughPlanRequestBased && (
          <p className="text-xs text-amber-800 bg-amber-50 border border-amber-200 rounded-md p-3">
            Walkthrough indicated request-based work. Request-Based Work is pre-selected — confirm
            before saving.
          </p>
        )}

        {suggestedWorkTaskIds.length > 0 && (
          <div className="rounded-md border border-sky-200 bg-sky-50 p-3 space-y-3">
            {intakeFullyApplied && !hasUnsavedIntakeSuggestions ? (
              <p className="text-sm text-emerald-900">
                Walkthrough selections are applied to approved work.
              </p>
            ) : configuredManuallyWithoutIntake ? (
              <p className="text-sm text-amber-950">
                Approved work was configured manually and does not yet include walkthrough
                selections. Apply walkthrough below or continue editing scope by hand.
              </p>
            ) : hasUnsavedIntakeSuggestions ? (
              <p className="text-sm text-sky-950">
                Walkthrough selections are pre-checked below. Save engagement settings or apply
                them now.
              </p>
            ) : (
              <p className="text-sm text-sky-950">
                Some walkthrough selections are not in approved work yet. Apply them or configure
                scope manually below.
              </p>
            )}
            {!intakeFullyApplied && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleApplyIntake}
                disabled={isApplying || isPending}
              >
                {isApplying ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Applying...
                  </>
                ) : (
                  "Apply walkthrough to approved work"
                )}
              </Button>
            )}
          </div>
        )}

        <div className="space-y-2">
          <Label>Engagement type</Label>
          <Select
            value={engagementType}
            onValueChange={(v) => setEngagementType(v as EngagementType)}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={EngagementType.SUPPORT_BLOCK}>
                {PRODUCT_LANGUAGE.engagement.supportBlock}
              </SelectItem>
              <SelectItem value={EngagementType.REQUEST_BASED}>
                {PRODUCT_LANGUAGE.engagement.requestBased}
              </SelectItem>
            </SelectContent>
          </Select>
        </div>

        {engagementType === EngagementType.SUPPORT_BLOCK ? (
          <div id="approved-work" className="space-y-4 max-h-[360px] overflow-y-auto border rounded-md p-4 scroll-mt-8">
            {categories.length === 0 ? (
              <p className="text-sm text-muted-foreground italic">
                No active work types in catalog. Run catalog v2 seed first.
              </p>
            ) : (
              categories.map((cat) => (
                <div key={cat.id} className="space-y-2">
                  <p className="text-sm font-semibold">{cat.name}</p>
                  <div className="space-y-2 pl-2">
                    {cat.tasks.map((task) => {
                      const fromIntake = suggestedSet.has(task.id) && !initialApprovedSet.has(task.id);
                      return (
                        <div key={task.id} className="flex items-start gap-2">
                          <Checkbox
                            id={`approve-${task.id}`}
                            checked={approved.has(task.id)}
                            onCheckedChange={(c) => toggleApproved(task.id, !!c)}
                            className="mt-0.5"
                          />
                          <div className="space-y-1">
                            <Label htmlFor={`approve-${task.id}`} className="font-normal text-sm">
                              {task.name}
                            </Label>
                            {fromIntake && (
                              <p className="text-xs text-sky-700">From walkthrough request</p>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))
            )}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">
            Request-based clients use the full active catalog per request. Pricing is set per
            request after review.
          </p>
        )}

        <Button onClick={handleSave} disabled={isPending || isApplying} className="w-full">
          {isPending ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Saving...
            </>
          ) : (
            "Save engagement settings"
          )}
        </Button>
      </CardContent>
    </Card>
  );
}
