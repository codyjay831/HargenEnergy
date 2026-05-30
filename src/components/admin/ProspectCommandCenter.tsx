"use client";

import { useState, useTransition } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { CheckCircle2, Circle, CircleHelp } from "lucide-react";
import { toast } from "sonner";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { SetupProgressRail } from "@/components/setup-guide/SetupProgressRail";
import { ProspectOnboardingGuideDialog } from "@/components/admin/ProspectOnboardingGuideDialog";
import { RequestMoreInfoDialog } from "@/components/admin/RequestMoreInfoDialog";
import { ActivateClientButton } from "@/components/forms/ActivateClientButton";
import {
  deriveDiscoveryPipelineStage,
  getDiscoveryStageConfig,
} from "@/lib/discovery-scheduling/pipeline";
import { computeDiscoveryRailNodes } from "@/lib/discovery-scheduling/discovery-rail-utils";
import type { DiscoverySchedulingReadiness } from "@/lib/discovery-scheduling/scheduling-readiness";
import {
  ClientStatus,
  RequestStatus,
  DiscoveryAppointmentStatus,
  DiscoveryFitDecision,
  DiscoverySchedulingLinkStatus,
} from "@/generated/prisma/client";
import {
  qualifyDiscoveryRequest,
  markDiscoveryNotAFit,
  sendDiscoverySchedulingLink,
  resendDiscoverySchedulingLink,
  regenerateDiscoverySchedulingLink,
  revokeDiscoverySchedulingLink,
  getDiscoverySchedulingLinkUrl,
} from "@/app/actions/discovery-scheduling-admin";
import { adminClientTabHref } from "@/lib/admin-client-tabs";

type DiscoveryPanelId = "scheduling" | "notes" | "recap";

type ProspectCommandCenterProps = {
  clientId: string;
  clientStatus: ClientStatus;
  supportRequestId: string;
  requestStatus: RequestStatus;
  linkStatus: DiscoverySchedulingLinkStatus | null;
  appointmentStatus: DiscoveryAppointmentStatus | null;
  fitDecision: DiscoveryFitDecision | null;
  recapSentAt: Date | null;
  readiness: DiscoverySchedulingReadiness;
  prospectEmail: string;
  contactName: string;
  companyName: string;
  clientVisibleUpdate?: string | null;
  showPreActivationTabs: boolean;
};

function ChecklistRow({ done, label }: { done: boolean; label: string }) {
  return (
    <div className="flex items-center gap-2 text-sm">
      {done ? (
        <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600" aria-hidden />
      ) : (
        <Circle className="h-4 w-4 shrink-0 text-muted-foreground/50" aria-hidden />
      )}
      <span className={done ? "text-slate-700" : "text-muted-foreground"}>{label}</span>
    </div>
  );
}

export function ProspectCommandCenter({
  clientId,
  clientStatus,
  supportRequestId,
  requestStatus,
  linkStatus,
  appointmentStatus,
  fitDecision,
  recapSentAt,
  readiness,
  prospectEmail,
  contactName,
  companyName,
  clientVisibleUpdate,
  showPreActivationTabs,
}: ProspectCommandCenterProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();
  const [needsInfoDialogOpen, setNeedsInfoDialogOpen] = useState(false);
  const [guideOpen, setGuideOpen] = useState(false);

  const stage = deriveDiscoveryPipelineStage({
    clientStatus,
    requestStatus,
    linkStatus,
    appointmentStatus,
    fitDecision,
    recapSentAt,
  });
  const config = getDiscoveryStageConfig(stage);
  const railNodes = computeDiscoveryRailNodes(stage);
  const setupTabHref = adminClientTabHref(clientId, "setup");
  const billingTabHref = adminClientTabHref(clientId, "billing");

  // Build a discovery-tab URL with a panel param, preserving other existing params
  const openDiscoveryPanel = (panel: DiscoveryPanelId) => {
    const params = new URLSearchParams(searchParams?.toString() ?? "");
    params.set("tab", "discovery");
    params.set("panel", panel);
    router.push(`${pathname}?${params.toString()}`);
  };

  const openSetupTab = () => router.push(setupTabHref);
  const openBillingTab = () => router.push(billingTabHref);

  const run = (
    action: () => Promise<{
      error?: string;
      success?: boolean;
      warning?: string;
      schedulingUrl?: string;
    }>,
  ) => {
    startTransition(async () => {
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
    });
  };

  const primaryDisabled =
    ((stage === "qualified") && !readiness.ready) ||
    ((stage === "booking_canceled") && !readiness.ready) ||
    isPending;

  const approveConfirmMessage = fitDecision
    ? undefined
    : "No fit decision has been recorded yet. Approve this company as a client anyway?";

  const handlePrimary = () => {
    switch (stage) {
      case "new_request":
        openDiscoveryPanel("scheduling");
        return;
      case "awaiting_info":
        run(() => qualifyDiscoveryRequest(supportRequestId));
        return;
      case "qualified":
        run(() => sendDiscoverySchedulingLink(supportRequestId));
        return;
      case "link_sent":
        run(() => getDiscoverySchedulingLinkUrl(supportRequestId));
        return;
      case "booking_canceled":
        run(() => regenerateDiscoverySchedulingLink(supportRequestId));
        return;
      case "scheduled":
        openDiscoveryPanel("scheduling");
        return;
      case "completed":
        openDiscoveryPanel("notes");
        return;
      case "recap":
        openDiscoveryPanel("recap");
        return;
      case "active_client":
        openSetupTab();
        return;
    }
  };

  const showApprovePrimary = stage === "proposal_setup";

  return (
    <>
      <Card className="border-sky-200/80 shadow-sm">
        <CardContent className="pt-6 space-y-5">
          <div className="space-y-3">
            <div className="flex items-start justify-between gap-3">
              <h2 className="text-lg font-semibold">Prospect onboarding</h2>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="shrink-0 text-muted-foreground hover:text-foreground"
                aria-label="How prospect onboarding works"
                onClick={() => setGuideOpen(true)}
              >
                <CircleHelp className="h-4 w-4" aria-hidden />
                How this works
              </Button>
            </div>
            {readiness.blockers.length > 0 && (
              <div className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2.5 text-sm text-amber-900 space-y-1">
                {readiness.blockers.map((blocker) => (
                  <p key={blocker}>{blocker}</p>
                ))}
              </div>
            )}
            <SetupProgressRail nodes={railNodes.map((node) => ({ ...node, stepIds: [] }))} />
          </div>

          <div className="rounded-lg border bg-white p-4 space-y-3">
            <div>
              <h3 className="font-semibold text-base">{config.heading}</h3>
              <p className="text-sm text-muted-foreground mt-1">{config.description}</p>
              {stage === "awaiting_info" && clientVisibleUpdate && (
                <div className="mt-3 rounded-md border bg-muted/40 px-3 py-2 text-sm">
                  <p className="font-medium text-muted-foreground text-xs uppercase tracking-wide">
                    Sent to prospect
                  </p>
                  <p className="mt-1 whitespace-pre-wrap">{clientVisibleUpdate}</p>
                </div>
              )}
              {/* proposal_setup read-only checklist */}
              {stage === "proposal_setup" && (
                <div className="mt-3 space-y-1.5">
                  <ChecklistRow done={Boolean(recapSentAt)} label="Recap sent" />
                  <ChecklistRow done={Boolean(fitDecision)} label="Fit decision recorded" />
                </div>
              )}
            </div>

            <div className="flex flex-wrap gap-2 items-start">
              {/* Primary CTA */}
              {showApprovePrimary ? (
                <ActivateClientButton
                  clientId={clientId}
                  buttonLabel="Approve as Client"
                  isLoadingLabel="Approving..."
                  successMessage="Approved. Continue client setup below."
                  confirmMessage={approveConfirmMessage}
                />
              ) : (
                <Button onClick={handlePrimary} disabled={primaryDisabled}>
                  {config.primaryLabel}
                </Button>
              )}

              {/* proposal_setup secondaries */}
              {showApprovePrimary && showPreActivationTabs && (
                <>
                  <Button variant="outline" disabled={isPending} onClick={openSetupTab}>
                    Pre-activation setup
                  </Button>
                  <Button variant="outline" disabled={isPending} onClick={openBillingTab}>
                    Access & billing
                  </Button>
                </>
              )}

              {/* new_request secondaries */}
              {stage === "new_request" && (
                <>
                  <Button
                    variant="outline"
                    disabled={isPending}
                    onClick={() => setNeedsInfoDialogOpen(true)}
                  >
                    Request more info
                  </Button>
                  <Button
                    variant="outline"
                    disabled={isPending}
                    onClick={() => run(() => markDiscoveryNotAFit(supportRequestId))}
                  >
                    Mark not a fit
                  </Button>
                </>
              )}

              {/* awaiting_info secondaries */}
              {stage === "awaiting_info" && (
                <>
                  <Button
                    variant="outline"
                    disabled={isPending}
                    onClick={() => setNeedsInfoDialogOpen(true)}
                  >
                    Request more info
                  </Button>
                  <Button
                    variant="outline"
                    disabled={isPending}
                    onClick={() => run(() => markDiscoveryNotAFit(supportRequestId))}
                  >
                    Mark not a fit
                  </Button>
                </>
              )}

              {/* qualified secondary */}
              {stage === "qualified" && (
                <Button
                  variant="outline"
                  disabled={isPending}
                  onClick={() => run(() => markDiscoveryNotAFit(supportRequestId))}
                >
                  Mark not a fit
                </Button>
              )}

              {/* link_sent secondaries */}
              {stage === "link_sent" && (
                <>
                  <Button
                    variant="outline"
                    disabled={isPending}
                    onClick={() => run(() => resendDiscoverySchedulingLink(supportRequestId))}
                  >
                    Resend link
                  </Button>
                  <Button
                    variant="outline"
                    disabled={isPending}
                    onClick={() => run(() => regenerateDiscoverySchedulingLink(supportRequestId))}
                  >
                    Regenerate link
                  </Button>
                  <Button
                    variant="outline"
                    disabled={isPending}
                    onClick={() => run(() => revokeDiscoverySchedulingLink(supportRequestId))}
                  >
                    Revoke link
                  </Button>
                </>
              )}

              {/* booking_canceled secondary */}
              {stage === "booking_canceled" && (
                <Button
                  variant="outline"
                  disabled={isPending}
                  onClick={() => openDiscoveryPanel("scheduling")}
                >
                  Scheduling actions
                </Button>
              )}

              {/* completed secondary */}
              {stage === "completed" && (
                <Button
                  variant="outline"
                  disabled={isPending}
                  onClick={() => openDiscoveryPanel("recap")}
                >
                  Draft recap
                </Button>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      <RequestMoreInfoDialog
        open={needsInfoDialogOpen}
        onOpenChange={setNeedsInfoDialogOpen}
        supportRequestId={supportRequestId}
        prospectEmail={prospectEmail}
        contactName={contactName}
        companyName={companyName}
        defaultMessage={clientVisibleUpdate}
      />

      <ProspectOnboardingGuideDialog
        open={guideOpen}
        onOpenChange={setGuideOpen}
        currentStage={stage}
      />
    </>
  );
}
