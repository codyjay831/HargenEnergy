"use client";

import { useState } from "react";
import { ChevronDown, Check } from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { buttonVariants } from "@/components/ui/button";
import type { ClientSetupStep } from "@/lib/client-setup-readiness";
import {
  adminBlockerBadgeLabel,
  adminStatusLabel,
  customerBlockerBadgeLabel,
  customerStatusLabel,
  stepStatusTone,
} from "./setup-guide-utils";

type SetupDetailsAccordionProps = {
  steps: ClientSetupStep[];
  variant: "admin" | "customer";
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  id?: string;
};

function statusTextClass(tone: ReturnType<typeof stepStatusTone>): string {
  switch (tone) {
    case "success":
      return "text-emerald-700";
    case "danger":
      return "text-red-700";
    case "warning":
      return "text-amber-700";
    default:
      return "text-muted-foreground";
  }
}

function StepRow({
  step,
  variant,
  compact,
}: {
  step: ClientSetupStep;
  variant: "admin" | "customer";
  compact?: boolean;
}) {
  const statusLabel = variant === "admin" ? adminStatusLabel(step) : customerStatusLabel(step);
  const blockerLabel =
    variant === "admin"
      ? adminBlockerBadgeLabel(step.blockers)
      : customerBlockerBadgeLabel(step.blockers);
  const tone = stepStatusTone(step.status);
  const isDone = step.status === "complete" || step.status === "not_required";

  if (compact && isDone) {
    return (
      <li className="flex items-center gap-2 text-sm text-muted-foreground">
        <Check className="h-3.5 w-3.5 shrink-0 text-emerald-600" aria-hidden />
        <span className="line-through decoration-muted-foreground/40">{step.title}</span>
      </li>
    );
  }

  return (
    <li
      className={cn(
        "rounded-lg border p-3",
        isDone ? "border-border/60 bg-muted/20" : "border-border bg-background",
      )}
    >
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="space-y-1">
          <p className={cn("text-sm font-medium", isDone && "text-muted-foreground")}>
            {step.title}
          </p>
          {!compact && step.description && (
            <p className="text-xs leading-relaxed text-muted-foreground">{step.description}</p>
          )}
        </div>
        <span className={cn("text-xs font-medium", statusTextClass(tone))}>{statusLabel}</span>
      </div>
      {!compact && (
        <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
          {!isDone && blockerLabel !== "Informational" && <span>{blockerLabel}</span>}
          {step.actionHref && step.actionLabel && (
            <Link
              href={step.actionHref}
              className={cn(buttonVariants({ variant: "link", size: "sm" }), "h-auto px-0 text-xs")}
            >
              {step.actionLabel}
            </Link>
          )}
        </div>
      )}
    </li>
  );
}

export function SetupDetailsAccordion({
  steps,
  variant,
  open: controlledOpen,
  onOpenChange,
  id = "setup-details",
}: SetupDetailsAccordionProps) {
  const [uncontrolledOpen, setUncontrolledOpen] = useState(false);
  const open = controlledOpen ?? uncontrolledOpen;
  const setOpen = onOpenChange ?? setUncontrolledOpen;

  const completedSteps = steps.filter(
    (step) => step.status === "complete" || step.status === "not_required",
  );
  const activeSteps = steps.filter(
    (step) => step.status !== "complete" && step.status !== "not_required",
  );

  return (
    <div id={id} className="rounded-lg border border-border/80 bg-muted/10">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left"
        aria-expanded={open}
      >
        <div>
          <p className="text-sm font-semibold">Setup details</p>
          <p className="text-xs text-muted-foreground">
            {completedSteps.length} complete · {activeSteps.length} remaining
          </p>
        </div>
        <ChevronDown
          className={cn(
            "h-4 w-4 shrink-0 text-muted-foreground transition-transform",
            open && "rotate-180",
          )}
          aria-hidden
        />
      </button>

      {open && (
        <div className="space-y-4 border-t border-border/80 px-4 py-4">
          {completedSteps.length > 0 && (
            <div className="space-y-2">
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Completed
              </p>
              <ul className="space-y-1.5">
                {completedSteps.map((step) => (
                  <StepRow key={step.id} step={step} variant={variant} compact />
                ))}
              </ul>
            </div>
          )}

          {activeSteps.length > 0 && (
            <div className="space-y-2">
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Remaining
              </p>
              <ul className="space-y-2">
                {activeSteps.map((step) => (
                  <StepRow key={step.id} step={step} variant={variant} />
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
