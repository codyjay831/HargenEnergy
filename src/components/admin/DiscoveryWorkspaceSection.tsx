"use client";

import { useState } from "react";
import { ChevronDown, CircleAlert, CheckCircle2 } from "lucide-react";
import { cn } from "@/lib/utils";

export type SectionAttention = "action" | "complete" | "neutral";

type DiscoveryWorkspaceSectionProps = {
  id?: string;
  title: string;
  subtitle?: string;
  attention?: SectionAttention;
  defaultOpen?: boolean;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  children: React.ReactNode;
};

export function DiscoveryWorkspaceSection({
  id,
  title,
  subtitle,
  attention = "neutral",
  defaultOpen = false,
  open: controlledOpen,
  onOpenChange,
  children,
}: DiscoveryWorkspaceSectionProps) {
  const [uncontrolledOpen, setUncontrolledOpen] = useState(defaultOpen);
  const isOpen = controlledOpen ?? uncontrolledOpen;
  const setIsOpen = onOpenChange ?? setUncontrolledOpen;

  const ariaLabel =
    attention === "action"
      ? `Action needed — ${title}`
      : attention === "complete"
        ? `${title} — complete`
        : title;

  return (
    <div id={id} className="rounded-lg border border-border/80 bg-white scroll-mt-4">
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="flex w-full items-center justify-between gap-3 px-4 py-3.5 text-left"
        aria-expanded={isOpen}
        aria-label={ariaLabel}
      >
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="w-4 shrink-0 flex items-center justify-center" aria-hidden>
            {attention === "action" && (
              <CircleAlert className="h-4 w-4 text-amber-500" />
            )}
            {attention === "complete" && (
              <CheckCircle2 className="h-4 w-4 text-emerald-600" />
            )}
          </div>
          <div className="min-w-0">
            <p className="text-sm font-semibold leading-snug">{title}</p>
            {subtitle && (
              <p className="text-xs text-muted-foreground mt-0.5">{subtitle}</p>
            )}
          </div>
        </div>
        <ChevronDown
          className={cn(
            "h-4 w-4 shrink-0 text-muted-foreground transition-transform",
            isOpen && "rotate-180",
          )}
          aria-hidden
        />
      </button>

      {isOpen && (
        <div className="border-t border-border/80 px-4 py-4">
          {children}
        </div>
      )}
    </div>
  );
}
