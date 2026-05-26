"use client";

import { useCallback, useState, type ReactNode } from "react";
import type { ClientSetupStep } from "@/lib/client-setup-readiness";
import { SetupDetailsAccordion } from "./SetupDetailsAccordion";
import { SetupNextStepCard } from "./SetupNextStepCard";
import { SetupProgressRail } from "./SetupProgressRail";
import { useSetupGuide } from "./SetupGuideProvider";
import type { SetupRailNode } from "./setup-guide-utils";

type SetupGuideShellProps = {
  title: string;
  summary?: ReactNode;
  railNodes: SetupRailNode[];
  nextStep: ClientSetupStep | null;
  allComplete: boolean;
  steps: ClientSetupStep[];
  variant: "admin" | "customer";
};

export function SetupGuideShell({
  title,
  summary,
  railNodes,
  nextStep,
  allComplete,
  steps,
  variant,
}: SetupGuideShellProps) {
  const [detailsOpen, setDetailsOpen] = useState(false);
  const { openRailNode, openSheet } = useSetupGuide();

  const openDetails = useCallback(() => {
    setDetailsOpen(true);
  }, []);

  const handleStepAction = useCallback(
    (step: ClientSetupStep) => {
      if (step.interactionMode === "sheet" && step.sheetKey) {
        openSheet(step.sheetKey);
        return;
      }
    },
    [openSheet],
  );

  return (
    <div className="space-y-5">
      <div className="space-y-3">
        <h2 className="text-lg font-semibold">{title}</h2>
        {summary}
        <SetupProgressRail nodes={railNodes} onNodeClick={openRailNode} />
      </div>

      <SetupNextStepCard
        step={nextStep}
        variant={variant}
        allComplete={allComplete}
        onViewDetails={openDetails}
        onStepAction={handleStepAction}
      />

      <SetupDetailsAccordion
        steps={steps}
        variant={variant}
        open={detailsOpen}
        onOpenChange={setDetailsOpen}
        onStepAction={handleStepAction}
      />
    </div>
  );
}
