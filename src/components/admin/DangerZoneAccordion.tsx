"use client";

import { type ReactNode, useState } from "react";
import { ChevronDown } from "lucide-react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type DangerZoneAccordionProps = {
  children: ReactNode;
};

export function DangerZoneAccordion({ children }: DangerZoneAccordionProps) {
  const [open, setOpen] = useState(false);

  return (
    <section className="max-w-3xl rounded-lg border border-slate-200 bg-white">
      <Button
        type="button"
        variant="ghost"
        className="flex w-full items-center justify-between rounded-lg px-4 py-3 text-left"
        onClick={() => setOpen((value) => !value)}
      >
        <span className="text-sm font-medium text-slate-900">Danger zone</span>
        <ChevronDown className={cn("h-4 w-4 text-slate-500 transition-transform", open && "rotate-180")} />
      </Button>
      {open && <div className="space-y-6 border-t border-slate-200 p-4">{children}</div>}
    </section>
  );
}
