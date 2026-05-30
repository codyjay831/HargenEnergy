"use client";

import { useCallback } from "react";
import { Card, CardContent } from "@/components/ui/card";
import type { ClientSetupReadiness, ClientSetupStep } from "@/lib/client-setup-readiness";
import type { ClientPortalSupportSetup } from "@/lib/portal-support";
import type { ClientDiscoveryRequest } from "@/lib/portal-discovery";
import { SetupGuideShell } from "@/components/setup-guide/SetupGuideShell";
import { SetupGuideProvider, useSetupGuide } from "@/components/setup-guide/SetupGuideProvider";
import { SetupStepSheet } from "@/components/setup-guide/SetupStepSheet";
import { PortalSetupSheetPanels } from "@/components/setup-guide/PortalSetupSheetPanels";
import { SetupDetailsAccordion } from "@/components/setup-guide/SetupDetailsAccordion";
import {
  CUSTOMER_NEXT_STEP_ORDER,
  CUSTOMER_SETUP_RAIL,
  type CustomerSetupGuideSurface,
  computeRailNodes,
  findNextRequiredStep,
  resolveCustomerSetupGuideView,
} from "@/components/setup-guide/setup-guide-utils";

function PortalSetupSummary({ readiness }: { readiness: ClientSetupReadiness }) {
  const sendWorkLabel = readiness.canSubmitPortalWork
    ? "Send work ready"
    : "Send work blocked";

  return (
    <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm">
      <span
        className={
          readiness.canSubmitPortalWork
            ? "font-medium text-emerald-700"
            : "font-medium text-red-700"
        }
      >
        {sendWorkLabel}
        {!readiness.canSubmitPortalWork && readiness.primarySubmitBlockMessage && (
          <span className="font-normal text-red-600/90">
            {" · "}
            {readiness.primarySubmitBlockMessage}
          </span>
        )}
      </span>
      <span className="text-muted-foreground">
        Billing:{" "}
        <span className="font-medium text-foreground">
          {readiness.billing.customerStatusLabel}
        </span>
      </span>
    </div>
  );
}

type PortalSetupGuideClientProps = {
  readiness: ClientSetupReadiness;
  surface: CustomerSetupGuideSurface;
  setup?: ClientPortalSupportSetup | null;
  discovery?: ClientDiscoveryRequest | null;
};

function FullSetupGuide({ readiness }: { readiness: ClientSetupReadiness }) {
  const railNodes = computeRailNodes(readiness.customerSteps, CUSTOMER_SETUP_RAIL);
  const nextStep = findNextRequiredStep(readiness.customerSteps, CUSTOMER_NEXT_STEP_ORDER);
  const allComplete = nextStep == null;

  return (
    <Card className="border-sky-200/80 bg-sky-50/20 shadow-sm">
      <CardContent className="pt-4">
        <SetupGuideShell
          title="Setup guide"
          summary={<PortalSetupSummary readiness={readiness} />}
          railNodes={railNodes}
          nextStep={nextStep}
          allComplete={allComplete}
          steps={readiness.customerSteps}
          variant="customer"
          compact
        />
      </CardContent>
    </Card>
  );
}

function MinimizedSetupGuide({ readiness }: { readiness: ClientSetupReadiness }) {
  const { openSheet } = useSetupGuide();

  const handleStepAction = useCallback(
    (step: ClientSetupStep) => {
      if (step.interactionMode === "sheet" && step.sheetKey) {
        openSheet(step.sheetKey);
      }
    },
    [openSheet],
  );

  return (
    <div className="rounded-lg border border-emerald-200/60 bg-emerald-50/20 px-4 py-3 space-y-2">
      <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
        <span className="text-sm font-medium text-emerald-800">Setup complete</span>
        <PortalSetupSummary readiness={readiness} />
      </div>
      <SetupDetailsAccordion
        steps={readiness.customerSteps}
        variant="customer"
        onStepAction={handleStepAction}
      />
    </div>
  );
}

export function PortalSetupGuideClient({
  readiness,
  surface,
  setup,
  discovery,
}: PortalSetupGuideClientProps) {
  const view = resolveCustomerSetupGuideView({
    customerSteps: readiness.customerSteps,
    surface,
  });

  if (view.mode === "hidden") {
    return null;
  }

  return (
    <SetupGuideProvider variant="customer">
      {view.mode === "full" ? (
        <FullSetupGuide readiness={readiness} />
      ) : (
        <MinimizedSetupGuide readiness={readiness} />
      )}
      <SetupStepSheet>
        <PortalSetupSheetPanels
          readiness={readiness}
          setup={setup}
          discovery={discovery}
        />
      </SetupStepSheet>
    </SetupGuideProvider>
  );
}
