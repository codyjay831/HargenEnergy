import { Card, CardContent } from "@/components/ui/card";
import type { ClientSetupReadiness } from "@/lib/client-setup-readiness";
import { SetupGuideShell } from "@/components/setup-guide/SetupGuideShell";
import {
  CUSTOMER_NEXT_STEP_ORDER,
  CUSTOMER_SETUP_RAIL,
  computeRailNodes,
  findNextStep,
} from "@/components/setup-guide/setup-guide-utils";

function PortalSetupSummary({ readiness }: { readiness: ClientSetupReadiness }) {
  return (
    <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm">
      <span
        className={
          readiness.canSubmitPortalWork
            ? "font-medium text-emerald-700"
            : "font-medium text-red-700"
        }
      >
        {readiness.canSubmitPortalWork ? "Send work ready" : "Send work blocked"}
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

export function PortalSetupGuide({ readiness }: { readiness: ClientSetupReadiness }) {
  const railNodes = computeRailNodes(readiness.customerSteps, CUSTOMER_SETUP_RAIL);
  const nextStep = findNextStep(readiness.customerSteps, CUSTOMER_NEXT_STEP_ORDER);
  const allComplete = nextStep == null;

  return (
    <Card className="border-sky-200/80 bg-sky-50/20 shadow-sm">
      <CardContent className="pt-6">
        <SetupGuideShell
          title="Setup guide"
          summary={<PortalSetupSummary readiness={readiness} />}
          railNodes={railNodes}
          nextStep={nextStep}
          allComplete={allComplete}
          steps={readiness.customerSteps}
          variant="customer"
        />
      </CardContent>
    </Card>
  );
}
