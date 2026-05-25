"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { updateRequest } from "@/app/actions/requests";
import { REQUEST_STATUS_VALUES, type RequestStatusValue } from "@/lib/ui-enums";

interface UpdateRequestFormProps {
  request: {
    id: string;
    status: RequestStatusValue;
    needsInfo: boolean;
    internalNotes: string | null;
    clientVisibleUpdate: string | null;
    estimatedMinutes: number | null;
  };
}

export function UpdateRequestForm({ request }: UpdateRequestFormProps) {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [status, setStatus] = useState<RequestStatusValue>(request.status);
  const [needsInfo, setNeedsInfo] = useState(request.needsInfo);
  const [sendEmailUpdate, setSendEmailUpdate] = useState(false);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsSubmitting(true);

    const previousStatus = request.status;
    const formData = new FormData(e.currentTarget);
    const data = {
      status,
      needsInfo,
      internalNotes: (formData.get("internalNotes") as string) || null,
      clientVisibleUpdate: (formData.get("clientVisibleUpdate") as string) || null,
      estimatedMinutes: parseInt(formData.get("estimatedMinutes") as string) || null,
      sendEmailUpdate,
    };

    const result = await updateRequest(request.id, data);

    if (result.success) {
      if (result.warning) {
        toast.warning(result.warning);
      } else if (previousStatus === "NEW" && status === "REVIEWED") {
        toast.success("Marked as in conversation.");
      } else {
        toast.success("Request updated");
      }
      setSendEmailUpdate(false);
      router.refresh();
    } else {
      toast.error(result.error || "Failed to update request.");
    }

    setIsSubmitting(false);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="space-y-2">
          <Label htmlFor="status">Status</Label>
          <Select
            value={status}
            onValueChange={(v) => setStatus(v as RequestStatusValue)}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {REQUEST_STATUS_VALUES.map((s) => (
                <SelectItem key={s} value={s}>
                  {s.replace("_", " ")}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="flex items-center space-x-2 pt-8">
          <Checkbox
            id="needsInfo"
            checked={needsInfo}
            onCheckedChange={(checked) => setNeedsInfo(!!checked)}
          />
          <Label htmlFor="needsInfo">Needs Information from Client</Label>
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="internalNotes">Internal Notes (Admin only)</Label>
        <Textarea
          id="internalNotes"
          name="internalNotes"
          defaultValue={request.internalNotes || ""}
          placeholder="Add notes about progress, bottlenecks, or next steps..."
          className="min-h-[100px]"
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="clientVisibleUpdate">Client-Visible Update</Label>
        <Textarea
          id="clientVisibleUpdate"
          name="clientVisibleUpdate"
          defaultValue={request.clientVisibleUpdate || ""}
          placeholder="What should the client see in their portal?"
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="estimatedMinutes">Estimated Minutes</Label>
        <Input
          id="estimatedMinutes"
          name="estimatedMinutes"
          type="number"
          defaultValue={request.estimatedMinutes || ""}
          placeholder="e.g. 60"
        />
      </div>

      <div className="flex items-center space-x-2 p-4 bg-slate-50 rounded-lg border border-slate-200">
        <Checkbox
          id="sendEmailUpdate"
          checked={sendEmailUpdate}
          onCheckedChange={(checked) => setSendEmailUpdate(!!checked)}
        />
        <div className="grid gap-1.5 leading-none">
          <Label htmlFor="sendEmailUpdate" className="cursor-pointer">
            Send client-visible update by email
          </Label>
          <p className="text-xs text-muted-foreground">
            Only sends if a client-visible update is provided above.
          </p>
        </div>
      </div>

      <Button type="submit" className="w-full" disabled={isSubmitting}>
        {isSubmitting ? "Updating..." : "Save Changes"}
      </Button>
    </form>
  );
}
