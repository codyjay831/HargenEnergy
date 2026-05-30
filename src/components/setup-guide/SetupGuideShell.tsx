"use client";

import { useCallback, useState, type ReactNode } from "react";
import type { ClientSetupStep } from "@/lib/client-setup-readiness";
import { SetupDetailsAccordion } from "./SetupDetailsAccordion";
import { SetupNextStepCard } from "./SetupNextStepCard";
import { SetupNextStepInline } from "./SetupNextStepInline";
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
  compact?: boolean;
};

export function SetupGuideShell({
  title,
  summary,
  railNodes,
  nextStep,
  allComplete,
  steps,
  variant,
  compact = false,
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

  const NextStep = compact ? SetupNextStepInline : SetupNextStepCard;

  return (
    <div className={compact ? "space-y-3" : "space-y-5"}>
      <div className="space-y-3">
        <h2 className="text-lg font-semibold">{title}</h2>
        {summary}
        <SetupProgressRail nodes={railNodes} onNodeClick={openRailNode} />
      </div>

      <NextStep
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
