"use client";

import { useState, useTransition } from "react";
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
import { updateClientEngagement } from "@/app/actions/clients";
import { EngagementType } from "@/generated/prisma/client";
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
  categories: Category[];
  walkthroughPlanOneTime?: boolean;
}

export function ClientEngagementManager({
  clientId,
  engagementType: initialEngagement,
  approvedWorkTaskIds: initialApproved,
  categories,
  walkthroughPlanOneTime,
}: ClientEngagementManagerProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [engagementType, setEngagementType] = useState<EngagementType>(
    walkthroughPlanOneTime && initialEngagement === EngagementType.BLOCK_SUPPORT
      ? EngagementType.ONE_OFF
      : initialEngagement,
  );
  const [approved, setApproved] = useState<Set<string>>(new Set(initialApproved));

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
            engagementType === EngagementType.BLOCK_SUPPORT
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

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-md">Engagement & approved work</CardTitle>
        <p className="text-sm text-muted-foreground">
          Set how this client buys help. Block clients need approved work types before portal
          invite.
        </p>
      </CardHeader>
      <CardContent className="space-y-6">
        {walkthroughPlanOneTime && (
          <p className="text-xs text-amber-800 bg-amber-50 border border-amber-200 rounded-md p-3">
            Walkthrough indicated one-time work. ONE_OFF is pre-selected — confirm before saving.
          </p>
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
              <SelectItem value={EngagementType.BLOCK_SUPPORT}>
                Hourly support block
              </SelectItem>
              <SelectItem value={EngagementType.ONE_OFF}>One-off work</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {engagementType === EngagementType.BLOCK_SUPPORT ? (
          <div className="space-y-4 max-h-[360px] overflow-y-auto border rounded-md p-4">
            {categories.length === 0 ? (
              <p className="text-sm text-muted-foreground italic">
                No active work types in catalog. Run catalog v2 seed first.
              </p>
            ) : (
              categories.map((cat) => (
                <div key={cat.id} className="space-y-2">
                  <p className="text-sm font-semibold">{cat.name}</p>
                  <div className="space-y-2 pl-2">
                    {cat.tasks.map((task) => (
                      <div key={task.id} className="flex items-center gap-2">
                        <Checkbox
                          id={`approve-${task.id}`}
                          checked={approved.has(task.id)}
                          onCheckedChange={(c) => toggleApproved(task.id, !!c)}
                        />
                        <Label htmlFor={`approve-${task.id}`} className="font-normal text-sm">
                          {task.name}
                        </Label>
                      </div>
                    ))}
                  </div>
                </div>
              ))
            )}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">
            One-off clients use the full catalog per job. Pricing is set per request after review.
          </p>
        )}

        <Button onClick={handleSave} disabled={isPending} className="w-full">
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
