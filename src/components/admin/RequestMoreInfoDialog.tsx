"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { markWalkthroughNeedsInfo } from "@/app/actions/walkthrough-scheduling-admin";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

type RequestMoreInfoDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  supportRequestId: string;
  prospectEmail: string;
  contactName: string;
  companyName: string;
  defaultMessage?: string | null;
  onSuccess?: () => void;
};

export function RequestMoreInfoDialog({
  open,
  onOpenChange,
  supportRequestId,
  prospectEmail,
  contactName,
  companyName,
  defaultMessage,
  onSuccess,
}: RequestMoreInfoDialogProps) {
  const router = useRouter();
  const [message, setMessage] = useState(defaultMessage ?? "");
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    if (open) {
      setMessage(defaultMessage ?? "");
    }
  }, [open, defaultMessage]);

  const handleSubmit = () => {
    startTransition(async () => {
      const result = await markWalkthroughNeedsInfo(supportRequestId, message);
      if (result.error) {
        toast.error(result.error);
        return;
      }
      if (result.warning) {
        toast.warning(result.warning);
      } else {
        toast.success(`Request sent to ${companyName}`);
      }
      onOpenChange(false);
      onSuccess?.();
      router.refresh();
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Request more info</DialogTitle>
          <DialogDescription>
            Send a message to {contactName} at {companyName}. They can reply directly to your
            inbox.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-2 py-2">
          <Label htmlFor="needsInfoMessage">What do you need from them?</Label>
          <Textarea
            id="needsInfoMessage"
            value={message}
            onChange={(event) => setMessage(event.target.value)}
            rows={5}
            placeholder="Describe the details or documents you need before scheduling a walkthrough..."
            disabled={isPending}
          />
          <p className="text-xs text-muted-foreground">
            Sent to {prospectEmail}. Replies go to your email inbox.
          </p>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)} disabled={isPending}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={isPending || message.trim().length < 10}>
            {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Send request
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
