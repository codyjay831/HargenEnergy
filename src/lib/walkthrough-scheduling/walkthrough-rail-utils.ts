import type { WalkthroughPipelineStage } from "@/lib/walkthrough-scheduling/pipeline";
import { WALKTHROUGH_PIPELINE_RAIL } from "@/lib/walkthrough-scheduling/pipeline";
import type { RailNodeState } from "@/components/setup-guide/setup-guide-utils";

export type WalkthroughRailNode = {
  id: string;
  label: string;
  state: RailNodeState;
};

const STAGE_ORDER: WalkthroughPipelineStage[] = [
  "new_request",
  "awaiting_info",
  "qualified",
  "link_sent",
  "scheduled",
  "completed",
  "recap",
  "proposal_setup",
  "active_client",
  "not_a_fit",
];

function stageIndex(stage: WalkthroughPipelineStage): number {
  const index = STAGE_ORDER.indexOf(stage);
  return index === -1 ? 0 : index;
}

export function computeWalkthroughRailNodes(
  currentStage: WalkthroughPipelineStage,
): WalkthroughRailNode[] {
  const currentIndex = stageIndex(currentStage);

  return WALKTHROUGH_PIPELINE_RAIL.map((rail) => {
    const railIndex = Math.max(
      ...rail.stages.map((stage) => stageIndex(stage)),
    );

    let state: RailNodeState = "future";
    if (currentStage === "not_a_fit" && rail.id === "decision") {
      state = "attention";
    } else if (currentStage === "active_client") {
      state = "complete";
    } else if (railIndex < currentIndex) {
      state = "complete";
    } else if (rail.stages.includes(currentStage)) {
      state = "current";
    }

    return { id: rail.id, label: rail.label, state };
  });
}
