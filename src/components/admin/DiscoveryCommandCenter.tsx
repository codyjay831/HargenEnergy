"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { SetupProgressRail } from "@/components/setup-guide/SetupProgressRail";
import { RequestMoreInfoDialog } from "@/components/admin/RequestMoreInfoDialog";
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

type DiscoveryCommandCenterProps = {
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
};

export function DiscoveryCommandCenter({
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
}: DiscoveryCommandCenterProps) {
  const router = useRouter();
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

  const openDiscoveryTab = () => {
    router.push(adminClientTabHref(clientId, "discovery"));
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
        openDiscoveryTab();
        break;
      case "awaiting_info":
        run(() => qualifyDiscoveryRequest(supportRequestId));
        break;
      case "qualified":
        run(() => sendDiscoverySchedulingLink(supportRequestId));
        break;
      case "link_sent":
        run(() => getDiscoverySchedulingLinkUrl(supportRequestId));
        break;
      case "booking_canceled":
        run(() => regenerateDiscoverySchedulingLink(supportRequestId));
        break;
      default:
        openDiscoveryTab();
    }
  };

  return (
    <>
      <Card className="border-sky-200/80 shadow-sm">
        <CardContent className="pt-6 space-y-5">
          <div className="space-y-3">
            <h2 className="text-lg font-semibold">Discovery scheduling</h2>
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
                <Button variant="outline" onClick={openDiscoveryTab}>
                  Open discovery workspace
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
