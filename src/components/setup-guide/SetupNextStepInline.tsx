import Link from "next/link";
import { ArrowRight, CheckCircle2 } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { ClientSetupStep } from "@/lib/client-setup-readiness";
import { blockerNote, optionalNote, ownerLabel } from "./setup-guide-utils";

type SetupNextStepInlineProps = {
  step: ClientSetupStep | null;
  variant: "admin" | "customer";
  allComplete?: boolean;
  onViewDetails?: () => void;
  onStepAction?: (step: ClientSetupStep) => void;
};

export function SetupNextStepInline({
  step,
  variant,
  allComplete = false,
  onViewDetails,
  onStepAction,
}: SetupNextStepInlineProps) {
  if (allComplete || !step) {
    return (
      <div className="flex items-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50/40 px-3 py-2.5 text-sm text-emerald-800">
        <CheckCircle2 className="h-4 w-4 shrink-0" aria-hidden />
        <span className="font-medium">
          {variant === "admin" ? "Required setup complete" : "Setup complete"}
        </span>
      </div>
    );
  }

  const blocking = blockerNote(step, variant);
  const optional = optionalNote(step);
  const useSheet = step.interactionMode === "sheet" && step.sheetKey && onStepAction;
  const label = variant === "admin" ? "Next required step" : "Next step";

  return (
    <div className="flex flex-wrap items-start justify-between gap-3 rounded-lg border border-sky-200 bg-sky-50/40 p-3">
      <div className="min-w-0 space-y-1">
        <p className="text-xs font-semibold uppercase tracking-wide text-sky-700">{label}</p>
        <p className="text-sm font-semibold text-slate-900">{step.title}</p>
        <p className="text-xs text-muted-foreground">
          <span className="font-medium text-foreground">Owner: </span>
          {ownerLabel(step.owner, variant)}
        </p>
        {step.description && (
          <p className="text-xs leading-relaxed text-muted-foreground">{step.description}</p>
        )}
        {blocking && <p className="text-xs font-medium text-red-700">{blocking}</p>}
        {optional && (
          <p className="text-xs text-amber-800">
            <span className="font-medium">Optional</span>
            {" · can be completed later"}
          </p>
        )}
        {onViewDetails && (
          <button
            type="button"
            onClick={onViewDetails}
            className="text-xs font-medium text-sky-700 underline-offset-4 hover:underline"
          >
            View setup details
          </button>
        )}
      </div>
      {step.actionLabel && (useSheet || step.actionHref) && (
        useSheet ? (
          <button
            type="button"
            onClick={() => onStepAction(step)}
            className={cn(
              buttonVariants({ size: "sm" }),
              "shrink-0 bg-sky-600 text-white hover:bg-sky-700",
            )}
          >
            {step.actionLabel}
            <ArrowRight className="ml-1 h-4 w-4" aria-hidden />
          </button>
        ) : (
          <Link
            href={step.actionHref!}
            className={cn(
              buttonVariants({ size: "sm" }),
              "shrink-0 bg-sky-600 text-white hover:bg-sky-700",
            )}
          >
            {step.actionLabel}
            <ArrowRight className="ml-1 h-4 w-4" aria-hidden />
          </Link>
        )
      )}
    </div>
  );
}
