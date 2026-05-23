import Link from "next/link";
import { ArrowRight, CheckCircle2 } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { ClientSetupStep } from "@/lib/client-setup-readiness";
import {
  blockerNote,
  optionalNote,
  ownerLabel,
  type RailNodeState,
} from "./setup-guide-utils";

type SetupNextStepCardProps = {
  step: ClientSetupStep | null;
  variant: "admin" | "customer";
  allComplete?: boolean;
  onViewDetails?: () => void;
};

function cardAccentClass(state: RailNodeState | "done"): string {
  if (state === "done") return "border-emerald-200 bg-emerald-50/50";
  if (state === "blocked") return "border-red-200 bg-red-50/40";
  if (state === "attention" || state === "optional") return "border-amber-200 bg-amber-50/40";
  return "border-sky-200 bg-sky-50/50";
}

function stepToAccent(step: ClientSetupStep | null): RailNodeState | "done" {
  if (!step) return "done";
  if (step.status === "blocked") return "blocked";
  if (step.status === "attention") return "attention";
  if (!step.required && step.status === "incomplete") return "optional";
  return "current";
}

export function SetupNextStepCard({
  step,
  variant,
  allComplete = false,
  onViewDetails,
}: SetupNextStepCardProps) {
  if (allComplete || !step) {
    return (
      <div
        className={cn(
          "rounded-xl border p-5 sm:p-6",
          cardAccentClass("done"),
        )}
      >
        <div className="flex items-start gap-3">
          <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-emerald-600" aria-hidden />
          <div className="space-y-1">
            <p className="text-base font-semibold text-emerald-900">
              {variant === "admin" ? "Setup complete" : "You are ready to go"}
            </p>
            <p className="text-sm text-emerald-800/80">
              {variant === "admin"
                ? "Core setup steps are complete. Use setup details below to review optional items."
                : "Your portal setup is complete. You can send work whenever you are ready."}
            </p>
          </div>
        </div>
      </div>
    );
  }

  const blocking = blockerNote(step, variant);
  const optional = optionalNote(step);
  const accent = stepToAccent(step);

  return (
    <div
      className={cn(
        "rounded-xl border p-5 sm:p-6",
        cardAccentClass(accent),
      )}
    >
      <div className="space-y-4">
        <div className="space-y-2">
          <p className="text-xs font-semibold uppercase tracking-wide text-sky-700">
            Next step
          </p>
          <h3 className="text-lg font-semibold leading-snug sm:text-xl">
            {step.title}
          </h3>
          <p className="text-sm text-muted-foreground">
            <span className="font-medium text-foreground">Owner: </span>
            {ownerLabel(step.owner, variant)}
          </p>
        </div>

        {step.description && (
          <p className="text-sm leading-relaxed text-foreground/90">{step.description}</p>
        )}

        {(blocking || optional) && (
          <div className="space-y-1.5 text-sm">
            {blocking && (
              <p className="rounded-md border border-red-200/80 bg-red-50/80 px-3 py-2 text-red-800">
                {blocking}
              </p>
            )}
            {optional && (
              <p className="rounded-md border border-amber-200/80 bg-amber-50/60 px-3 py-2 text-amber-900">
                {optional}
              </p>
            )}
          </div>
        )}

        <div className="flex flex-wrap items-center gap-3 pt-1">
          {step.actionHref && step.actionLabel && (
            <Link
              href={step.actionHref}
              className={cn(
                buttonVariants({ size: "default" }),
                "bg-sky-600 text-white hover:bg-sky-700",
              )}
            >
              {step.actionLabel}
              <ArrowRight className="ml-1.5 h-4 w-4" aria-hidden />
            </Link>
          )}
          {onViewDetails ? (
            <button
              type="button"
              onClick={onViewDetails}
              className="text-sm font-medium text-sky-700 underline-offset-4 hover:underline"
            >
              View setup details
            </button>
          ) : (
            <a
              href="#setup-details"
              className="text-sm font-medium text-sky-700 underline-offset-4 hover:underline"
            >
              View setup details
            </a>
          )}
        </div>
      </div>
    </div>
  );
}
