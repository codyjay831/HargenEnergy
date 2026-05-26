"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { SetupProgressRail } from "@/components/setup-guide/SetupProgressRail";
import { RequestMoreInfoDialog } from "@/components/admin/RequestMoreInfoDialog";
import {
  deriveWalkthroughPipelineStage,
  getWalkthroughStageConfig,
} from "@/lib/walkthrough-scheduling/pipeline";
import { computeWalkthroughRailNodes } from "@/lib/walkthrough-scheduling/walkthrough-rail-utils";
import type { WalkthroughSchedulingReadiness } from "@/lib/walkthrough-scheduling/scheduling-readiness";
import {
  ClientStatus,
  RequestStatus,
  WalkthroughAppointmentStatus,
  WalkthroughFitDecision,
  WalkthroughSchedulingLinkStatus,
} from "@/generated/prisma/client";
import {
  qualifyWalkthroughRequest,
  markWalkthroughNotAFit,
  sendWalkthroughSchedulingLink,
  resendWalkthroughSchedulingLink,
  regenerateWalkthroughSchedulingLink,
  revokeWalkthroughSchedulingLink,
  getWalkthroughSchedulingLinkUrl,
} from "@/app/actions/walkthrough-scheduling-admin";
import { adminClientTabHref } from "@/lib/admin-client-tabs";

type WalkthroughCommandCenterProps = {
  clientId: string;
  clientStatus: ClientStatus;
  supportRequestId: string;
  requestStatus: RequestStatus;
  linkStatus: WalkthroughSchedulingLinkStatus | null;
  appointmentStatus: WalkthroughAppointmentStatus | null;
  fitDecision: WalkthroughFitDecision | null;
  recapSentAt: Date | null;
  readiness: WalkthroughSchedulingReadiness;
  prospectEmail: string;
  contactName: string;
  companyName: string;
  clientVisibleUpdate?: string | null;
};

export function WalkthroughCommandCenter({
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
}: WalkthroughCommandCenterProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [needsInfoDialogOpen, setNeedsInfoDialogOpen] = useState(false);

  const stage = deriveWalkthroughPipelineStage({
    clientStatus,
    requestStatus,
    linkStatus,
    appointmentStatus,
    fitDecision,
    recapSentAt,
  });
  const config = getWalkthroughStageConfig(stage);
  const railNodes = computeWalkthroughRailNodes(stage);

  const openWalkthroughTab = () => {
    router.push(adminClientTabHref(clientId, "walkthrough"));
  };

  const run = (action: () => Promise<{ error?: string; success?: boolean; warning?: string; schedulingUrl?: string }>) => {
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

  const handlePrimary = () => {
    switch (stage) {
      case "new_request":
        openWalkthroughTab();
        break;
      case "awaiting_info":
        run(() => qualifyWalkthroughRequest(supportRequestId));
        break;
      case "qualified":
        run(() => sendWalkthroughSchedulingLink(supportRequestId));
        break;
      case "link_sent":
        run(() => getWalkthroughSchedulingLinkUrl(supportRequestId));
        break;
      case "booking_canceled":
        run(() => regenerateWalkthroughSchedulingLink(supportRequestId));
        break;
      default:
        openWalkthroughTab();
    }
  };

  return (
    <>
      <Card className="border-sky-200/80 shadow-sm">
        <CardContent className="pt-6 space-y-5">
          <div className="space-y-3">
            <h2 className="text-lg font-semibold">Walkthrough scheduling</h2>
            {readiness.blockers.length > 0 && (
              <div className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2.5 text-sm text-amber-900 space-y-1">
                {readiness.blockers.map((blocker) => (
                  <p key={blocker}>{blocker}</p>
                ))}
              </div>
            )}
            <SetupProgressRail
              nodes={railNodes.map((node) => ({ ...node, stepIds: [] }))}
            />
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
            <div className="flex flex-wrap gap-2">
              <Button onClick={handlePrimary} disabled={primaryDisabled}>
                {config.primaryLabel}
              </Button>
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
                    onClick={() => run(() => markWalkthroughNotAFit(supportRequestId))}
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
                    onClick={() => run(() => markWalkthroughNotAFit(supportRequestId))}
                  >
                    Mark not a fit
                  </Button>
                </>
              )}
              {stage === "qualified" && (
                <Button
                  variant="outline"
                  disabled={isPending}
                  onClick={() => run(() => markWalkthroughNotAFit(supportRequestId))}
                >
                  Mark not a fit
                </Button>
              )}
              {stage === "link_sent" && (
                <>
                  <Button
                    variant="outline"
                    disabled={isPending}
                    onClick={() => run(() => resendWalkthroughSchedulingLink(supportRequestId))}
                  >
                    Resend link
                  </Button>
                  <Button
                    variant="outline"
                    disabled={isPending}
                    onClick={() => run(() => regenerateWalkthroughSchedulingLink(supportRequestId))}
                  >
                    Regenerate link
                  </Button>
                  <Button
                    variant="outline"
                    disabled={isPending}
                    onClick={() => run(() => revokeWalkthroughSchedulingLink(supportRequestId))}
                  >
                    Revoke link
                  </Button>
                </>
              )}
              {(stage === "scheduled" || stage === "completed" || stage === "recap") && (
                <Button variant="outline" onClick={openWalkthroughTab}>
                  Open walkthrough workspace
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
    </>
  );
}
