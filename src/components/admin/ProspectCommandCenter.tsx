"use client";

import { useState, useTransition } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { toast } from "sonner";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { SetupProgressRail } from "@/components/setup-guide/SetupProgressRail";
import { RequestMoreInfoDialog } from "@/components/admin/RequestMoreInfoDialog";
import { ActivateClientButton } from "@/components/forms/ActivateClientButton";
import {
  deriveDiscoveryPipelineStage,
  getDiscoveryStageConfig,
} from "@/lib/discovery-scheduling/pipeline";
import { computeDiscoveryRailNodes } from "@/lib/discovery-scheduling/discovery-rail-utils";
import { resolveDiscoveryPrimaryNavigation } from "@/lib/discovery-scheduling/discovery-primary-navigation";
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

  const currentHref = `${pathname}${searchParams?.toString() ? `?${searchParams.toString()}` : ""}`;

  const openSetupTab = () => {
    router.push(setupTabHref);
  };

  const openBillingTab = () => {
    router.push(billingTabHref);
  };

  const openDiscoveryTab = () => {
    const href = adminClientTabHref(clientId, "discovery");
    if (currentHref === href) {
      document.getElementById("discovery-workspace")?.scrollIntoView({ behavior: "smooth" });
      return;
    }
    router.push(href);
  };

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
    ((config.primaryLabel === "Send scheduling link" ||
      config.primaryLabel === "Regenerate scheduling link") &&
      !readiness.ready) ||
    isPending;

  const approveConfirmMessage = fitDecision
    ? undefined
    : "No fit decision has been recorded yet. Approve this company as a client anyway?";

  const handlePrimary = () => {
    const navigation = resolveDiscoveryPrimaryNavigation(stage, clientId);

    switch (stage) {
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
      case "active_client":
        openSetupTab();
        return;
      case "new_request":
      case "scheduled":
      case "completed":
      case "recap":
        openDiscoveryTab();
        return;
      default:
        if (navigation.kind === "tab") {
          router.push(navigation.href);
        } else if (navigation.kind === "discovery_tab") {
          openDiscoveryTab();
        }
    }
  };

  const showApprovePrimary = stage === "proposal_setup";

  return (
    <>
      <Card className="border-sky-200/80 shadow-sm">
        <CardContent className="pt-6 space-y-5">
          <div className="space-y-3">
            <h2 className="text-lg font-semibold">Prospect onboarding</h2>
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
            </div>
            <div className="flex flex-wrap gap-2 items-start">
              {showApprovePrimary ? (
                <ActivateClientButton
                  clientId={clientId}
                  buttonLabel="Approve as Client"
                  isLoadingLabel="Approving..."
                  successMessage="Company approved as active client. Continue setup in active client view."
                  confirmMessage={approveConfirmMessage}
                />
              ) : (
                <Button onClick={handlePrimary} disabled={primaryDisabled}>
                  {config.primaryLabel}
                </Button>
              )}
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
              {stage === "qualified" && (
                <Button
                  variant="outline"
                  disabled={isPending}
                  onClick={() => run(() => markDiscoveryNotAFit(supportRequestId))}
                >
                  Mark not a fit
                </Button>
              )}
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
              {(stage === "scheduled" || stage === "completed" || stage === "recap") && (
                <>
                  <Button variant="outline" onClick={openDiscoveryTab}>
                    Open discovery workspace
                  </Button>
                  {(stage === "completed" || stage === "recap") && (
                    <ActivateClientButton
                      clientId={clientId}
                      buttonLabel="Approve as Client"
                      isLoadingLabel="Approving..."
                      successMessage="Company approved as active client. Continue setup in active client view."
                      confirmMessage={approveConfirmMessage}
                    />
                  )}
                </>
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
    </>
  );
}
