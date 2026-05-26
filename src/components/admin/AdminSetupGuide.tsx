"use client";

import { useRouter } from "next/navigation";
import { Card, CardContent } from "@/components/ui/card";
import { BillingMode } from "@/generated/prisma/client";
import { getAdminBillingModeHeadline } from "@/lib/client-billing-mode";
import type { ClientSetupReadiness } from "@/lib/client-setup-readiness";
import { SetupGuideShell } from "@/components/setup-guide/SetupGuideShell";
import { SetupGuideProvider } from "@/components/setup-guide/SetupGuideProvider";
import { SetupStepSheet } from "@/components/setup-guide/SetupStepSheet";
import {
  AdminSetupSheetPanels,
  type AdminSetupSheetPanelsProps,
} from "@/components/setup-guide/AdminSetupSheetPanels";
import {
  ADMIN_NEXT_STEP_ORDER,
  ADMIN_SETUP_RAIL,
  computeRailNodes,
  findNextStep,
} from "@/components/setup-guide/setup-guide-utils";

function AdminSetupSummary({ readiness }: { readiness: ClientSetupReadiness }) {
  const billingLabel =
    readiness.billing.billingMode !== BillingMode.STRIPE
      ? getAdminBillingModeHeadline(readiness.billing)
      : readiness.billing.statusLabel;

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm">
        <span
          className={
            readiness.canInvitePortal ? "font-medium text-emerald-700" : "font-medium text-red-700"
          }
        >
          {readiness.canInvitePortal ? "Invite ready" : "Invite blocked"}
        </span>
        <span
          className={
            readiness.canSubmitPortalWork
              ? "font-medium text-emerald-700"
              : "font-medium text-red-700"
          }
        >
          {readiness.canSubmitPortalWork ? "Submit ready" : "Submit blocked"}
        </span>
        <span className="text-muted-foreground">
          Billing: <span className="font-medium text-foreground">{billingLabel}</span>
        </span>
      </div>
      {readiness.blockingMessages.length > 0 && (
        <div className="space-y-1 rounded-md border border-amber-200 bg-amber-50 px-3 py-2.5 text-sm text-amber-900">
          {readiness.blockingMessages.map((message) => (
            <p key={message}>{message}</p>
          ))}
        </div>
      )}
    </div>
  );
}

type AdminSetupGuideProps = AdminSetupSheetPanelsProps & {
  readiness: ClientSetupReadiness;
};

export function AdminSetupGuide({ readiness, ...sheetProps }: AdminSetupGuideProps) {
  const router = useRouter();
  const railNodes = computeRailNodes(readiness.adminSteps, ADMIN_SETUP_RAIL);
  const nextStep = findNextStep(readiness.adminSteps, ADMIN_NEXT_STEP_ORDER);
  const allComplete = nextStep == null;

  const openWalkthrough = () => {
    const url = new URL(window.location.href);
    url.searchParams.set("tab", "walkthrough");
    url.searchParams.set("open", "walkthrough");
    router.push(url.pathname + url.search);
  };

  return (
    <SetupGuideProvider variant="admin" onOpenWalkthrough={openWalkthrough}>
      <Card className="border-sky-200/80 shadow-sm">
        <CardContent className="pt-6">
          <SetupGuideShell
            title="Guided setup"
            summary={<AdminSetupSummary readiness={readiness} />}
            railNodes={railNodes}
            nextStep={nextStep}
            allComplete={allComplete}
            steps={readiness.adminSteps}
            variant="admin"
          />
        </CardContent>
      </Card>
      <SetupStepSheet>
        <AdminSetupSheetPanels {...sheetProps} />
      </SetupStepSheet>
    </SetupGuideProvider>
  );
}
