"use client";

import { useState, useEffect, useTransition } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { format } from "date-fns";
import { formatInTimeZone } from "date-fns-tz";
import {
  AlertTriangle,
  CalendarClock,
  CheckCircle2,
  Copy,
  ExternalLink,
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
import { DiscoveryWorkspaceSection, type SectionAttention } from "@/components/admin/DiscoveryWorkspaceSection";
import {
  getDiscoverySchedulingLinkUrl,
  markDiscoveryCompleted,
  markDiscoveryNoShow,
  markDiscoveryNotAFit,
  qualifyDiscoveryRequest,
  regenerateDiscoverySchedulingLink,
  resendDiscoverySchedulingLink,
  revokeDiscoverySchedulingLink,
  saveDiscoveryDiscoveryNotes,
  saveDiscoveryFitDecision,
  saveDiscoveryRecap,
  sendDiscoveryRecap,
  sendDiscoverySchedulingLink,
} from "@/app/actions/discovery-scheduling-admin";
import type { IntakeSnapshotClient, IntakeSnapshotMetadata } from "@/lib/intake-snapshot";
import { PRODUCT_LANGUAGE } from "@/lib/product-language";
import type { RequestStatusValue } from "@/lib/ui-enums";
import type { GoogleCalendarSyncStatus } from "@/generated/prisma/client";

type DiscoveryFitDecisionValue = "GOOD_FIT" | "MAYBE_FIT" | "NOT_A_FIT";
type DiscoveryPanelId = "scheduling" | "notes" | "recap";

interface DiscoveryWorkspaceProps {
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
    expiresAt: Date | string | null;
  } | null;
  appointment?: {
    id: string;
    scheduledStartUtc: Date | string;
    scheduledEndUtc: Date | string;
    timezone: string;
    meetingUrl: string | null;
    status: string;
    canceledAt?: Date | string | null;
    discoveryNotes: string | null;
    fitDecision: DiscoveryFitDecisionValue | null;
    fitDecisionReason: string | null;
    recapContent: string | null;
    recapSentAt: Date | string | null;
    googleSyncStatus: GoogleCalendarSyncStatus;
    googleSyncError: string | null;
  } | null;
  schedulingReadiness?: {
    ready: boolean;
    blockers: string[];
  };
}

const FIT_DECISION_OPTIONS: { value: DiscoveryFitDecisionValue; label: string }[] = [
  { value: "GOOD_FIT", label: "Good fit" },
  { value: "MAYBE_FIT", label: "Needs follow-up" },
  { value: "NOT_A_FIT", label: "Not a fit" },
];

function computeSchedulingAttention(
  request: DiscoveryWorkspaceProps["request"],
  schedulingLink: DiscoveryWorkspaceProps["schedulingLink"],
  appointment: DiscoveryWorkspaceProps["appointment"],
  schedulingReadiness: DiscoveryWorkspaceProps["schedulingReadiness"],
): SectionAttention {
  if (request.status === "CANCELLED") return "neutral";
  if (appointment?.status === "COMPLETED" || appointment?.status === "NO_SHOW") return "complete";
  if (appointment?.status === "SCHEDULED" || appointment?.status === "RESCHEDULED") {
    if (appointment.googleSyncStatus !== "SYNCED") return "action";
    return "complete";
  }
  if (appointment?.status === "CANCELED") return "action";
  if (request.status === "NEW" || request.status === "NEEDS_INFO") return "action";
  if (request.status === "REVIEWED" || request.status === "IN_PROGRESS") {
    if (!schedulingLink && !schedulingReadiness?.ready) return "action";
    return schedulingLink ? "complete" : "action";
  }
  return "neutral";
}

function computeNotesAttention(appointment: DiscoveryWorkspaceProps["appointment"]): SectionAttention {
  if (!appointment || appointment.status === "CANCELED") return "neutral";
  if (appointment.status === "COMPLETED" || appointment.status === "NO_SHOW") {
    return appointment.fitDecision ? "complete" : "action";
  }
  return "neutral";
}

function computeRecapAttention(appointment: DiscoveryWorkspaceProps["appointment"]): SectionAttention {
  if (!appointment || appointment.status === "CANCELED") return "neutral";
  if (appointment.status === "COMPLETED" || appointment.status === "NO_SHOW") {
    if (appointment.recapSentAt) return "complete";
    if (appointment.fitDecision) return "action";
  }
  return "neutral";
}

function schedulingSubtitle(
  request: DiscoveryWorkspaceProps["request"],
  schedulingLink: DiscoveryWorkspaceProps["schedulingLink"],
  appointment: DiscoveryWorkspaceProps["appointment"],
): string {
  if (appointment?.status === "SCHEDULED" || appointment?.status === "RESCHEDULED") {
    return "Meeting scheduled";
  }
  if (appointment?.status === "COMPLETED") return "Meeting completed";
  if (appointment?.status === "NO_SHOW") return "No-show recorded";
  if (appointment?.status === "CANCELED") return "Appointment canceled — rebook needed";
  if (schedulingLink?.status === "ACTIVE") return "Scheduling link sent";
  if (request.status === "NEEDS_INFO") return "Awaiting prospect response";
  if (request.status === "REVIEWED" || request.status === "IN_PROGRESS") return "Ready to schedule";
  return "Qualify, send link, manage appointment";
}

export function DiscoveryWorkspace({
  client,
  request,
  metadata,
  schedulingLink,
  appointment,
  schedulingReadiness,
}: DiscoveryWorkspaceProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();
  const [qualificationNotes, setQualificationNotes] = useState(request.internalNotes ?? "");
  const [discoveryNotes, setDiscoveryNotes] = useState(appointment?.discoveryNotes ?? "");
  const [fitDecision, setFitDecision] = useState<DiscoveryFitDecisionValue | "">(
    appointment?.fitDecision ?? "",
  );
  const [fitDecisionReason, setFitDecisionReason] = useState(appointment?.fitDecisionReason ?? "");
  const [recapContent, setRecapContent] = useState(appointment?.recapContent ?? "");
  const [needsInfoDialogOpen, setNeedsInfoDialogOpen] = useState(false);

  const [schedulingManual, setSchedulingManual] = useState(false);
  const [notesManual, setNotesManual] = useState(false);
  const [recapManual, setRecapManual] = useState(false);
  const [requestOpen, setRequestOpen] = useState(true);

  const panelParam = searchParams?.get("panel") as DiscoveryPanelId | null;

  const schedulingOpen = panelParam === "scheduling" || schedulingManual;
  const notesOpen = panelParam === "notes" || notesManual;
  const recapOpen = panelParam === "recap" || recapManual;

  const clearPanelParam = () => {
    const params = new URLSearchParams(searchParams?.toString() ?? "");
    params.delete("panel");
    const query = params.toString();
    router.replace(query ? `${pathname}?${query}` : pathname);
  };

  const handleSchedulingOpenChange = (open: boolean) => {
    if (!open && panelParam === "scheduling") {
      clearPanelParam();
      return;
    }
    setSchedulingManual(open);
  };

  const handleNotesOpenChange = (open: boolean) => {
    if (!open && panelParam === "notes") {
      clearPanelParam();
      return;
    }
    setNotesManual(open);
  };

  const handleRecapOpenChange = (open: boolean) => {
    if (!open && panelParam === "recap") {
      clearPanelParam();
      return;
    }
    setRecapManual(open);
  };

  useEffect(() => {
    if (!panelParam) return;
    const sectionId = `discovery-section-${panelParam}`;
    const el =
      document.getElementById(sectionId) ?? document.getElementById("discovery-workspace");
    el?.scrollIntoView({ behavior: "smooth", block: "start" });
  }, [panelParam]);

  const runAction = (
    action: () => Promise<{ error?: string; success?: boolean; warning?: string; schedulingUrl?: string }>,
  ) => {
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
      const result = await getDiscoverySchedulingLinkUrl(request.id);
      if ("error" in result && result.error) return { error: result.error };
      if (result.schedulingUrl) {
        await navigator.clipboard.writeText(result.schedulingUrl);
        toast.success("Scheduling link copied");
      }
      return { success: true };
    });
  };

  const linkActive = schedulingLink?.status === "ACTIVE";
  const canQualify = request.status === "NEW" || request.status === "NEEDS_INFO";
  const canSendLink = request.status !== "NEW" && schedulingReadiness?.ready;

  const schedulingAttention = computeSchedulingAttention(request, schedulingLink, appointment, schedulingReadiness);
  const notesAttention = computeNotesAttention(appointment);
  const recapAttention = computeRecapAttention(appointment);

  const notesSubtitle = appointment?.fitDecision
    ? `Fit decision: ${FIT_DECISION_OPTIONS.find((o) => o.value === appointment.fitDecision)?.label ?? appointment.fitDecision}`
    : appointment?.status === "COMPLETED" || appointment?.status === "NO_SHOW"
      ? "Fit decision pending"
      : "Notes and fit decision after the call";

  const recapSubtitle = appointment?.recapSentAt
    ? `Sent ${format(new Date(appointment.recapSentAt), "MMM d, yyyy")}`
    : "Draft and send post-discovery email";

  const showNotes = Boolean(appointment && appointment.status !== "CANCELED");
  const showRecap = Boolean(appointment);

  return (
    <div className="space-y-3">
      {/* Slim meeting strip — visible without expanding the scheduling section */}
      {appointment && appointment.status !== "CANCELED" && (
        <div className="flex flex-wrap items-center gap-3 rounded-lg border border-border/80 bg-white px-4 py-3 text-sm">
          <CalendarClock className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden />
          <span className="font-medium text-slate-900">
            {formatInTimeZone(
              new Date(appointment.scheduledStartUtc),
              appointment.timezone,
              "EEE, MMM d 'at' h:mm a zzz",
            )}
          </span>
          <Badge variant={appointment.status === "COMPLETED" ? "secondary" : "default"}>
            {appointment.status}
          </Badge>
          {appointment.meetingUrl &&
            appointment.status !== "COMPLETED" &&
            appointment.status !== "NO_SHOW" && (
              <a
                href={appointment.meetingUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1 text-primary hover:underline font-medium"
              >
                Join meeting
                <ExternalLink className="h-3.5 w-3.5" aria-hidden />
              </a>
            )}
        </div>
      )}

      {/* Request review — default open */}
      <DiscoveryWorkspaceSection
        id="discovery-section-request"
        title="Request review"
        subtitle={`Intake details for ${PRODUCT_LANGUAGE.discoveryRequest.singular.toLowerCase()}`}
        defaultOpen
        open={requestOpen}
        onOpenChange={setRequestOpen}
      >
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
      </DiscoveryWorkspaceSection>

      {/* Scheduling actions */}
      <DiscoveryWorkspaceSection
        id="discovery-section-scheduling"
        title="Scheduling actions"
        subtitle={schedulingSubtitle(request, schedulingLink, appointment)}
        attention={schedulingAttention}
        open={schedulingOpen}
        onOpenChange={handleSchedulingOpenChange}
      >
        <div className="space-y-4">
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
              disabled={isPending || !canQualify}
              onClick={() => runAction(() => qualifyDiscoveryRequest(request.id, qualificationNotes))}
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
              onClick={() => runAction(() => markDiscoveryNotAFit(request.id, qualificationNotes))}
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
                {schedulingLink.expiresAt && (
                  <span>Expires {format(new Date(schedulingLink.expiresAt), "MMM d, yyyy")}</span>
                )}
              </div>
            )}

            <div className="flex flex-wrap gap-2">
              <Button
                disabled={isPending || !canSendLink || linkActive}
                onClick={() => runAction(() => sendDiscoverySchedulingLink(request.id))}
              >
                <Send className="mr-2 h-4 w-4" />
                Send link
              </Button>
              <Button
                variant="outline"
                disabled={isPending || !linkActive}
                onClick={() => runAction(() => resendDiscoverySchedulingLink(request.id))}
              >
                <Mail className="mr-2 h-4 w-4" />
                Resend
              </Button>
              <Button
                variant="outline"
                disabled={isPending || !canSendLink}
                onClick={() => runAction(() => regenerateDiscoverySchedulingLink(request.id))}
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
                onClick={() => runAction(() => revokeDiscoverySchedulingLink(request.id))}
              >
                Revoke
              </Button>
            </div>
          </div>

          {appointment && (
            <div className="border-t pt-4 space-y-3">
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-sm font-medium">Booked appointment</span>
                <Badge variant={appointment.status === "CANCELED" ? "destructive" : "secondary"}>
                  {appointment.status}
                </Badge>
              </div>
              {appointment.status === "CANCELED" && (
                <div className="rounded-md border border-amber-200 bg-amber-50/60 px-3 py-2 text-sm text-amber-950">
                  Prospect canceled this booking
                  {appointment.canceledAt
                    ? ` on ${format(new Date(appointment.canceledAt), "MMM d, yyyy")}`
                    : ""}
                  . They can rebook from their existing link, or you can regenerate a link if the
                  current one expired.
                </div>
              )}
              {appointment.googleSyncStatus !== "SYNCED" && (
                <div className="rounded-md border border-amber-200 bg-amber-50/60 px-3 py-2 text-sm text-amber-950">
                  <div className="flex items-center gap-2 font-medium">
                    <AlertTriangle className="h-4 w-4" />
                    Calendar sync status: {appointment.googleSyncStatus}
                  </div>
                  {appointment.googleSyncError && (
                    <p className="mt-1 break-words text-amber-900">{appointment.googleSyncError}</p>
                  )}
                </div>
              )}
              <p className="text-sm text-muted-foreground">
                {formatInTimeZone(
                  new Date(appointment.scheduledStartUtc),
                  appointment.timezone,
                  "EEEE, MMMM d, yyyy 'at' h:mm a zzz",
                )}
              </p>
              {appointment.meetingUrl && appointment.status !== "CANCELED" && (
                <a
                  href={appointment.meetingUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm text-primary hover:underline"
                >
                  Join meeting
                </a>
              )}
              {appointment.status !== "CANCELED" && (
                <div className="flex flex-wrap gap-2">
                  <Button
                    variant="outline"
                    disabled={isPending || appointment.status === "COMPLETED"}
                    onClick={() => runAction(() => markDiscoveryCompleted(appointment.id))}
                  >
                    <CheckCircle2 className="mr-2 h-4 w-4" />
                    Mark completed
                  </Button>
                  <Button
                    variant="outline"
                    disabled={isPending || appointment.status === "NO_SHOW"}
                    onClick={() => runAction(() => markDiscoveryNoShow(appointment.id))}
                  >
                    <UserX className="mr-2 h-4 w-4" />
                    Mark no-show
                  </Button>
                </div>
              )}
            </div>
          )}
        </div>
      </DiscoveryWorkspaceSection>

      {/* Discovery notes — visible once appointment exists and isn't canceled */}
      {showNotes && (
        <DiscoveryWorkspaceSection
          id="discovery-section-notes"
          title="Discovery notes"
          subtitle={notesSubtitle}
          attention={notesAttention}
          open={notesOpen}
          onOpenChange={handleNotesOpenChange}
        >
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="discoveryNotes">Notes</Label>
              <Textarea
                id="discoveryNotes"
                value={discoveryNotes}
                onChange={(event) => setDiscoveryNotes(event.target.value)}
                rows={5}
                placeholder="What did you learn on the discovery?"
              />
            </div>
            <Button
              variant="outline"
              disabled={isPending}
              onClick={() =>
                runAction(() => saveDiscoveryDiscoveryNotes(appointment!.id, discoveryNotes))
              }
            >
              Save notes
            </Button>

            <div className="grid grid-cols-1 gap-4 border-t pt-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label>Fit decision</Label>
                <Select
                  value={fitDecision}
                  onValueChange={(value) => setFitDecision(value as DiscoveryFitDecisionValue)}
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
                  saveDiscoveryFitDecision(
                    appointment!.id,
                    fitDecision as DiscoveryFitDecisionValue,
                    fitDecisionReason,
                  ),
                )
              }
            >
              Save fit decision
            </Button>
          </div>
        </DiscoveryWorkspaceSection>
      )}

      {/* Recap — visible once appointment exists */}
      {showRecap && (
        <DiscoveryWorkspaceSection
          id="discovery-section-recap"
          title="Recap"
          subtitle={recapSubtitle}
          attention={recapAttention}
          open={recapOpen}
          onOpenChange={handleRecapOpenChange}
        >
          <div className="space-y-4">
            {appointment!.recapSentAt && (
              <div className="flex items-center gap-2 text-sm text-emerald-700">
                <CheckCircle2 className="h-4 w-4" />
                Sent {format(new Date(appointment!.recapSentAt), "MMM d, yyyy 'at' h:mm a")}
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
                onClick={() => runAction(() => saveDiscoveryRecap(appointment!.id, recapContent))}
              >
                Save recap
              </Button>
              <Button
                disabled={isPending || !recapContent.trim()}
                onClick={() => runAction(() => sendDiscoveryRecap(appointment!.id))}
              >
                <Send className="mr-2 h-4 w-4" />
                Send recap
              </Button>
            </div>
          </div>
        </DiscoveryWorkspaceSection>
      )}

      {isPending && (
        <div className="fixed left-4 right-4 bottom-4 z-30 flex items-center gap-2 rounded-md border bg-background px-3 py-2 shadow-md md:left-auto md:right-6 md:bottom-6">
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
