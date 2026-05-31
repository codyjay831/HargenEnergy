"use client";

import { useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowRight, CheckCircle2 } from "lucide-react";

import { ActivateClientButton } from "@/components/forms/ActivateClientButton";
import {
  AdminSetupSheetPanels,
  type AdminSetupSheetPanelsProps,
} from "@/components/setup-guide/AdminSetupSheetPanels";
import { SetupDetailsAccordion } from "@/components/setup-guide/SetupDetailsAccordion";
import { SetupGuideProvider, useSetupGuide } from "@/components/setup-guide/SetupGuideProvider";
import { SetupStepSheet } from "@/components/setup-guide/SetupStepSheet";
import {
  ADMIN_NEXT_STEP_ORDER,
  blockerNote,
  findNextRequiredStep,
} from "@/components/setup-guide/setup-guide-utils";
import { buttonVariants } from "@/components/ui/button";
import { BillingMode, ClientStatus, EngagementType } from "@/generated/prisma/client";
import { getAdminBillingModeHeadline } from "@/lib/client-billing-mode";
import type { ClientSetupReadiness, ClientSetupStep } from "@/lib/client-setup-readiness";
import { cn } from "@/lib/utils";

type ClientCommandBarProps = AdminSetupSheetPanelsProps & {
  readiness: ClientSetupReadiness;
  openRequestCount: number;
  hoursUsed?: number;
  hoursReserved?: number;
  isNearLimit?: boolean;
  isOverLimit?: boolean;
};

function isOperationalMode(readiness: ClientSetupReadiness): boolean {
  return (
    readiness.clientStatus === ClientStatus.ACTIVE &&
    readiness.canSubmitPortalWork &&
    readiness.blockingMessages.length === 0
  );
}

function StatusPill({ label, ok, detail }: { label: string; ok: boolean; detail?: string }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-medium",
        ok
          ? "border-emerald-200 bg-emerald-50 text-emerald-800"
          : "border-red-200 bg-red-50 text-red-800",
      )}
    >
      {label}
      {detail ? <span className="font-normal opacity-80">· {detail}</span> : null}
    </span>
  );
}

function CommandBarBody({
  readiness,
  openRequestCount,
  hoursUsed,
  hoursReserved,
  isNearLimit,
  isOverLimit,
}: Omit<ClientCommandBarProps, keyof AdminSetupSheetPanelsProps>) {
  const { openSheet } = useSetupGuide();
  const operational = isOperationalMode(readiness);
  const nextStep = findNextRequiredStep(readiness.adminSteps, ADMIN_NEXT_STEP_ORDER);

  const handleStepAction = useCallback(
    (step: ClientSetupStep) => {
      if (step.interactionMode === "sheet" && step.sheetKey) {
        openSheet(step.sheetKey);
      }
    },
    [openSheet],
  );

  const billingLabel =
    readiness.billing.billingMode !== BillingMode.STRIPE
      ? getAdminBillingModeHeadline(readiness.billing)
      : readiness.billing.statusLabel;

  if (operational) {
    return (
      <div className="space-y-3">
        <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-sm">
          <span className="inline-flex items-center gap-1.5 font-medium text-emerald-800">
            <CheckCircle2 className="h-4 w-4 shrink-0" aria-hidden />
            Ready to work
          </span>
          {readiness.engagementType === EngagementType.SUPPORT_BLOCK &&
            hoursUsed != null &&
            hoursReserved != null && (
              <span className="text-slate-600">
                <span
                  className={cn(
                    "font-medium",
                    isOverLimit
                      ? "text-red-600"
                      : isNearLimit
                        ? "text-orange-600"
                        : "text-emerald-700",
                  )}
                >
                  {hoursUsed.toFixed(1)}
                </span>
                {" / "}
                {hoursReserved}h this week
              </span>
            )}
          <span className="text-slate-600">
            {openRequestCount === 0
              ? "No open requests"
              : `${openRequestCount} open request${openRequestCount === 1 ? "" : "s"}`}
          </span>
        </div>
        <SetupDetailsAccordion
          steps={readiness.adminSteps}
          variant="admin"
          onStepAction={handleStepAction}
        />
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-2">
        <StatusPill label="Invite" ok={readiness.canInvitePortal} />
        <StatusPill label="Agreement" ok={readiness.agreementReady} />
        <StatusPill label="Submit" ok={readiness.canSubmitPortalWork} />
        <StatusPill label="Catalog" ok={readiness.catalogReady} />
        <StatusPill label="Billing" ok={readiness.billingReady} detail={billingLabel} />
      </div>

      {!readiness.canSubmitPortalWork && readiness.primarySubmitBlockReason && (
        <p className="text-sm text-amber-900">
          <span className="font-medium">Primary blocker:</span>{" "}
          {readiness.submitBlockers.primary?.adminMessage ??
            readiness.primarySubmitBlockMessage}
        </p>
      )}

      {readiness.blockingMessages.length > 0 && (
        <div className="space-y-1 rounded-lg border border-amber-200 bg-amber-50/80 px-3 py-2 text-sm text-amber-900">
          {readiness.blockingMessages.map((message) => (
            <p key={message}>{message}</p>
          ))}
        </div>
      )}

      {readiness.clientStatus !== ClientStatus.ACTIVE && (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-slate-200 p-3">
          <p className="text-sm font-medium text-slate-900">
            {readiness.canActivate
              ? "Ready to activate client"
              : "Activation blocked until readiness requirements are complete"}
          </p>
          <ActivateClientButton
            clientId={readiness.clientId}
            disabled={!readiness.canActivate}
            disabledReasons={readiness.activationBlockers.map((blocker) => blocker.message)}
          />
        </div>
      )}

      {nextStep ? (
        <div className="flex flex-wrap items-start justify-between gap-3 rounded-lg border border-sky-200 bg-sky-50/40 p-3">
          <div className="min-w-0 space-y-1">
            <p className="text-xs font-semibold uppercase tracking-wide text-sky-700">
              Next required step
            </p>
            <p className="text-sm font-semibold text-slate-900">{nextStep.title}</p>
            {nextStep.description && (
              <p className="text-xs leading-relaxed text-muted-foreground">{nextStep.description}</p>
            )}
            {blockerNote(nextStep, "admin") && (
              <p className="text-xs font-medium text-red-700">{blockerNote(nextStep, "admin")}</p>
            )}
          </div>
          {nextStep.actionLabel &&
            (nextStep.interactionMode === "sheet" && nextStep.sheetKey ? (
              <button
                type="button"
                onClick={() => handleStepAction(nextStep)}
                className={cn(
                  buttonVariants({ size: "sm" }),
                  "shrink-0 bg-emerald-600 text-white hover:bg-emerald-700",
                )}
              >
                {nextStep.actionLabel}
                <ArrowRight className="ml-1 h-4 w-4" aria-hidden />
              </button>
            ) : nextStep.actionHref ? (
              <Link
                href={nextStep.actionHref}
                className={cn(
                  buttonVariants({ size: "sm" }),
                  "shrink-0 bg-emerald-600 text-white hover:bg-emerald-700",
                )}
              >
                {nextStep.actionLabel}
                <ArrowRight className="ml-1 h-4 w-4" aria-hidden />
              </Link>
            ) : null)}
        </div>
      ) : readiness.clientStatus === ClientStatus.ACTIVE ? (
        <div className="flex items-center gap-2 text-sm text-emerald-800">
          <CheckCircle2 className="h-4 w-4 shrink-0" aria-hidden />
          Required setup complete. Optional items remain in setup details.
        </div>
      ) : null}

      <SetupDetailsAccordion
        steps={readiness.adminSteps}
        variant="admin"
        onStepAction={handleStepAction}
      />
    </div>
  );
}

export function ClientCommandBar({
  readiness,
  openRequestCount,
  hoursUsed,
  hoursReserved,
  isNearLimit,
  isOverLimit,
  ...sheetProps
}: ClientCommandBarProps) {
  const router = useRouter();

  const openDiscovery = () => {
    const url = new URL(window.location.href);
    url.searchParams.set("tab", "discovery");
    url.searchParams.set("open", "discovery");
    router.push(url.pathname + url.search);
  };

  return (
    <SetupGuideProvider variant="admin" onOpenDiscovery={openDiscovery}>
      <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-none">
        <CommandBarBody
          readiness={readiness}
          openRequestCount={openRequestCount}
          hoursUsed={hoursUsed}
          hoursReserved={hoursReserved}
          isNearLimit={isNearLimit}
          isOverLimit={isOverLimit}
        />
      </section>
      <SetupStepSheet>
        <AdminSetupSheetPanels {...sheetProps} />
      </SetupStepSheet>
    </SetupGuideProvider>
  );
}
