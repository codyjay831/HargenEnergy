"use client";

import { useCallback, useState, type ReactNode } from "react";
import type { ClientSetupStep } from "@/lib/client-setup-readiness";
import { SetupDetailsAccordion } from "./SetupDetailsAccordion";
import { SetupNextStepCard } from "./SetupNextStepCard";
import { SetupProgressRail } from "./SetupProgressRail";
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

  const openDetails = useCallback(() => {
    setDetailsOpen(true);
    requestAnimationFrame(() => {
      document.getElementById("setup-details")?.scrollIntoView({ behavior: "smooth", block: "nearest" });
    });
  }, []);

  return (
    <div className="space-y-5">
      <div className="space-y-3">
        <h2 className="text-lg font-semibold">{title}</h2>
        {summary}
        <SetupProgressRail nodes={railNodes} />
      </div>

      <SetupNextStepCard
        step={nextStep}
        variant={variant}
        allComplete={allComplete}
        onViewDetails={openDetails}
      />

      <SetupDetailsAccordion
        steps={steps}
        variant={variant}
        open={detailsOpen}
        onOpenChange={setDetailsOpen}
        id="setup-details"
      />
    </div>
  );
}
