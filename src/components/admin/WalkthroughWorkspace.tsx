"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { format } from "date-fns";
import { formatInTimeZone } from "date-fns-tz";
import {
  CalendarClock,
  CheckCircle2,
  Copy,
  Loader2,
  Mail,
  RefreshCw,
  Send,
  UserX,
} from "lucide-react";
import { toast } from "sonner";
import { IntakeLeadSnapshot } from "@/components/intake/IntakeLeadSnapshot";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { RequestMoreInfoDialog } from "@/components/admin/RequestMoreInfoDialog";
import {
  getWalkthroughSchedulingLinkUrl,
  markWalkthroughCompleted,
  markWalkthroughNoShow,
  markWalkthroughNotAFit,
  qualifyWalkthroughRequest,
  regenerateWalkthroughSchedulingLink,
  resendWalkthroughSchedulingLink,
  revokeWalkthroughSchedulingLink,
  saveWalkthroughDiscoveryNotes,
  saveWalkthroughFitDecision,
  saveWalkthroughRecap,
  sendWalkthroughRecap,
  sendWalkthroughSchedulingLink,
} from "@/app/actions/walkthrough-scheduling-admin";
import type { IntakeSnapshotClient, IntakeSnapshotMetadata } from "@/lib/intake-snapshot";
import { PRODUCT_LANGUAGE } from "@/lib/product-language";
import type { RequestStatusValue } from "@/lib/ui-enums";

type WalkthroughFitDecisionValue = "GOOD_FIT" | "MAYBE_FIT" | "NOT_A_FIT";

interface WalkthroughWorkspaceProps {
  client: IntakeSnapshotClient;
  request: {
    id: string;
    status: RequestStatusValue;
    supportNeeded: string | null;
    description: string;
    mostHelpful: string | null;
    urgency: string;
    internalNotes: string | null;
    clientVisibleUpdate?: string | null;
    requestedTasks?: Array<{ name: string; description?: string | null }>;
  };
  metadata?: IntakeSnapshotMetadata | null;
  schedulingLink?: {
    status: string;
    sentAt: Date | string | null;
    openedAt: Date | string | null;
    expiresAt: Date | string;
  } | null;
  appointment?: {
    id: string;
    scheduledStartUtc: Date | string;
    scheduledEndUtc: Date | string;
    timezone: string;
    meetingUrl: string | null;
    status: string;
    discoveryNotes: string | null;
    fitDecision: WalkthroughFitDecisionValue | null;
    fitDecisionReason: string | null;
    recapContent: string | null;
    recapSentAt: Date | string | null;
  } | null;
  schedulingReadiness?: {
    ready: boolean;
    blockers: string[];
  };
}

const FIT_DECISION_OPTIONS: { value: WalkthroughFitDecisionValue; label: string }[] = [
  { value: "GOOD_FIT", label: "Good fit" },
  { value: "MAYBE_FIT", label: "Maybe fit" },
  { value: "NOT_A_FIT", label: "Not a fit" },
];

export function WalkthroughWorkspace({
  client,
  request,
  metadata,
  schedulingLink,
  appointment,
  schedulingReadiness,
}: WalkthroughWorkspaceProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [qualificationNotes, setQualificationNotes] = useState(request.internalNotes ?? "");
  const [discoveryNotes, setDiscoveryNotes] = useState(appointment?.discoveryNotes ?? "");
  const [fitDecision, setFitDecision] = useState<WalkthroughFitDecisionValue | "">(
    appointment?.fitDecision ?? "",
  );
  const [fitDecisionReason, setFitDecisionReason] = useState(
    appointment?.fitDecisionReason ?? "",
  );
  const [recapContent, setRecapContent] = useState(appointment?.recapContent ?? "");
  const [needsInfoDialogOpen, setNeedsInfoDialogOpen] = useState(false);

  const runAction = (action: () => Promise<{ error?: string; success?: boolean; warning?: string; schedulingUrl?: string }>) => {
    startTransition(async () => {
      try {
        const result = await action();
        if (result.error) {
          toast.error(result.error);
          return;
        }
        if (result.warning) {
          toast.warning(result.warning);
        } else {
          toast.success("Updated");
        }
        if (result.schedulingUrl) {
          await navigator.clipboard.writeText(result.schedulingUrl);
          toast.message("Scheduling link copied to clipboard");
        }
        router.refresh();
      } catch {
        toast.error("Something went wrong");
      }
    });
  };

  const copySchedulingUrl = () => {
    runAction(async () => {
      const result = await getWalkthroughSchedulingLinkUrl(request.id);
      if ("error" in result && result.error) {
        return { error: result.error };
      }
      if (result.schedulingUrl) {
        await navigator.clipboard.writeText(result.schedulingUrl);
        toast.success("Scheduling link copied");
      }
      return { success: true };
    });
  };

  const linkActive = schedulingLink?.status === "ACTIVE";
  const canSendLink = request.status !== "NEW" && schedulingReadiness?.ready;

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Request review</CardTitle>
          <CardDescription>
            Intake details submitted for {PRODUCT_LANGUAGE.walkthrough.singular.toLowerCase()}.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <IntakeLeadSnapshot
            client={client}
            request={{
              supportNeeded: request.supportNeeded,
              description: request.description,
              mostHelpful: request.mostHelpful,
              urgency: request.urgency,
              requestedTasks: request.requestedTasks,
            }}
            metadata={metadata}
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Scheduling actions</CardTitle>
          <CardDescription>
            Qualify the request, then send a self-schedule link when Google Calendar and availability are configured.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {schedulingReadiness && !schedulingReadiness.ready && (
            <div className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900">
              <p className="font-medium">Scheduling not ready</p>
              <ul className="mt-1 list-disc pl-4">
                {schedulingReadiness.blockers.map((blocker) => (
                  <li key={blocker}>{blocker}</li>
                ))}
              </ul>
            </div>
          )}

          {request.status === "NEEDS_INFO" && request.clientVisibleUpdate && (
            <div className="rounded-md border border-sky-200 bg-sky-50/60 px-3 py-3 text-sm">
              <p className="font-medium text-sky-900 text-xs uppercase tracking-wide">
                Sent to prospect
              </p>
              <p className="mt-1 whitespace-pre-wrap text-sky-950">{request.clientVisibleUpdate}</p>
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="qualificationNotes">Internal notes</Label>
            <Textarea
              id="qualificationNotes"
              value={qualificationNotes}
              onChange={(event) => setQualificationNotes(event.target.value)}
              rows={3}
              placeholder="Qualification notes visible to staff only"
            />
          </div>

          <div className="flex flex-wrap gap-2">
            <Button
              variant="default"
              disabled={isPending || request.status !== "NEW"}
              onClick={() =>
                runAction(() => qualifyWalkthroughRequest(request.id, qualificationNotes))
              }
            >
              Qualify
            </Button>
            <Button
              variant="outline"
              disabled={isPending}
              onClick={() => setNeedsInfoDialogOpen(true)}
            >
              Needs info
            </Button>
            <Button
              variant="destructive"
              disabled={isPending}
              onClick={() =>
                runAction(() => markWalkthroughNotAFit(request.id, qualificationNotes))
              }
            >
              Not a fit
            </Button>
          </div>

          <div className="border-t pt-4 space-y-3">
            <div className="flex flex-wrap items-center gap-2">
              <CalendarClock className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm font-medium">Scheduling link</span>
              {schedulingLink ? (
                <Badge variant={linkActive ? "default" : "secondary"}>{schedulingLink.status}</Badge>
              ) : (
                <Badge variant="secondary">Not sent</Badge>
              )}
            </div>

            {schedulingLink && (
              <div className="grid grid-cols-1 gap-2 text-sm text-muted-foreground md:grid-cols-3">
                {schedulingLink.sentAt && (
                  <span>Sent {format(new Date(schedulingLink.sentAt), "MMM d, yyyy")}</span>
                )}
                {schedulingLink.openedAt && (
                  <span>Opened {format(new Date(schedulingLink.openedAt), "MMM d, yyyy")}</span>
                )}
                <span>Expires {format(new Date(schedulingLink.expiresAt), "MMM d, yyyy")}</span>
              </div>
            )}

            <div className="flex flex-wrap gap-2">
              <Button
                disabled={isPending || !canSendLink || linkActive}
                onClick={() => runAction(() => sendWalkthroughSchedulingLink(request.id))}
              >
                <Send className="mr-2 h-4 w-4" />
                Send link
              </Button>
              <Button
                variant="outline"
                disabled={isPending || !linkActive}
                onClick={() => runAction(() => resendWalkthroughSchedulingLink(request.id))}
              >
                <Mail className="mr-2 h-4 w-4" />
                Resend
              </Button>
              <Button
                variant="outline"
                disabled={isPending || !canSendLink}
                onClick={() => runAction(() => regenerateWalkthroughSchedulingLink(request.id))}
              >
                <RefreshCw className="mr-2 h-4 w-4" />
                Regenerate
              </Button>
              <Button
                variant="outline"
                disabled={isPending || !linkActive}
                onClick={copySchedulingUrl}
              >
                <Copy className="mr-2 h-4 w-4" />
                Copy URL
              </Button>
              <Button
                variant="outline"
                disabled={isPending || !linkActive}
                onClick={() => runAction(() => revokeWalkthroughSchedulingLink(request.id))}
              >
                Revoke
              </Button>
            </div>
          </div>

          {appointment && (
            <div className="border-t pt-4 space-y-3">
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-sm font-medium">Booked appointment</span>
                <Badge variant="secondary">{appointment.status}</Badge>
              </div>
              <p className="text-sm text-muted-foreground">
                {formatInTimeZone(
                  new Date(appointment.scheduledStartUtc),
                  appointment.timezone,
                  "EEEE, MMMM d, yyyy 'at' h:mm a zzz",
                )}
              </p>
              {appointment.meetingUrl && (
                <a
                  href={appointment.meetingUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm text-primary hover:underline"
                >
                  Join meeting
                </a>
              )}
              <div className="flex flex-wrap gap-2">
                <Button
                  variant="outline"
                  disabled={isPending || appointment.status === "COMPLETED"}
                  onClick={() => runAction(() => markWalkthroughCompleted(appointment.id))}
                >
                  <CheckCircle2 className="mr-2 h-4 w-4" />
                  Mark completed
                </Button>
                <Button
                  variant="outline"
                  disabled={isPending || appointment.status === "NO_SHOW"}
                  onClick={() => runAction(() => markWalkthroughNoShow(appointment.id))}
                >
                  <UserX className="mr-2 h-4 w-4" />
                  Mark no-show
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {appointment && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Discovery notes</CardTitle>
            <CardDescription>
              Capture walkthrough observations and fit assessment after the call.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="discoveryNotes">Notes</Label>
              <Textarea
                id="discoveryNotes"
                value={discoveryNotes}
                onChange={(event) => setDiscoveryNotes(event.target.value)}
                rows={5}
                placeholder="What did you learn on the walkthrough?"
              />
            </div>
            <Button
              variant="outline"
              disabled={isPending}
              onClick={() =>
                runAction(() => saveWalkthroughDiscoveryNotes(appointment.id, discoveryNotes))
              }
            >
              Save notes
            </Button>

            <div className="grid grid-cols-1 gap-4 border-t pt-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label>Fit decision</Label>
                <Select
                  value={fitDecision}
                  onValueChange={(value) => setFitDecision(value as WalkthroughFitDecisionValue)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select fit" />
                  </SelectTrigger>
                  <SelectContent>
                    {FIT_DECISION_OPTIONS.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="fitDecisionReason">Reason</Label>
                <Input
                  id="fitDecisionReason"
                  value={fitDecisionReason}
                  onChange={(event) => setFitDecisionReason(event.target.value)}
                  placeholder="Optional context"
                />
              </div>
            </div>
            <Button
              disabled={isPending || !fitDecision}
              onClick={() =>
                runAction(() =>
                  saveWalkthroughFitDecision(
                    appointment.id,
                    fitDecision as WalkthroughFitDecisionValue,
                    fitDecisionReason,
                  ),
                )
              }
            >
              Save fit decision
            </Button>
          </CardContent>
        </Card>
      )}

      {appointment && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Recap</CardTitle>
            <CardDescription>
              Draft and send a post-walkthrough recap email to the prospect.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {appointment.recapSentAt && (
              <div className="flex items-center gap-2 text-sm text-emerald-700">
                <CheckCircle2 className="h-4 w-4" />
                Sent {format(new Date(appointment.recapSentAt), "MMM d, yyyy 'at' h:mm a")}
              </div>
            )}
            <div className="space-y-2">
              <Label htmlFor="recapContent">Recap email content</Label>
              <Textarea
                id="recapContent"
                value={recapContent}
                onChange={(event) => setRecapContent(event.target.value)}
                rows={8}
                placeholder="Summary, next steps, and any follow-up items"
              />
            </div>
            <div className="flex flex-wrap gap-2">
              <Button
                variant="outline"
                disabled={isPending || !recapContent.trim()}
                onClick={() => runAction(() => saveWalkthroughRecap(appointment.id, recapContent))}
              >
                Save recap
              </Button>
              <Button
                disabled={isPending || !recapContent.trim()}
                onClick={() => runAction(() => sendWalkthroughRecap(appointment.id))}
              >
                <Send className="mr-2 h-4 w-4" />
                Send recap
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {isPending && (
        <div className="fixed bottom-6 right-6 flex items-center gap-2 rounded-md border bg-background px-3 py-2 shadow-md">
          <Loader2 className="h-4 w-4 animate-spin" />
          <span className="text-sm">Saving...</span>
        </div>
      )}

      <RequestMoreInfoDialog
        open={needsInfoDialogOpen}
        onOpenChange={setNeedsInfoDialogOpen}
        supportRequestId={request.id}
        prospectEmail={client.email}
        contactName={client.contactName}
        companyName={client.companyName}
        defaultMessage={request.clientVisibleUpdate}
      />
    </div>
  );
}
