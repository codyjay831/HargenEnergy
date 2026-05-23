import { Check } from "lucide-react";
import { cn } from "@/lib/utils";
import type { SetupRailNode } from "./setup-guide-utils";
import { railStateTone } from "./setup-guide-utils";

export function SetupProgressRail({ nodes }: { nodes: SetupRailNode[] }) {
  return (
    <div className="overflow-x-auto pb-1 -mx-1 px-1">
      <ol className="flex min-w-max items-center gap-1 sm:gap-2">
        {nodes.map((node, index) => (
          <li key={node.id} className="flex items-center gap-1 sm:gap-2">
            <div
              className={cn(
                "flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium whitespace-nowrap transition-colors sm:px-3 sm:py-1.5 sm:text-sm",
                railStateTone(node.state),
              )}
            >
              {node.state === "complete" ? (
                <Check className="h-3.5 w-3.5 shrink-0" aria-hidden />
              ) : (
                <span
                  className={cn(
                    "h-2 w-2 shrink-0 rounded-full",
                    node.state === "current" && "bg-sky-500",
                    node.state === "blocked" && "bg-red-500",
                    node.state === "attention" && "bg-amber-500",
                    node.state === "optional" && "bg-amber-400",
                    node.state === "future" && "bg-muted-foreground/40",
                  )}
                  aria-hidden
                />
              )}
              <span>{node.label}</span>
            </div>
            {index < nodes.length - 1 && (
              <span
                className={cn(
                  "hidden h-px w-4 shrink-0 sm:block sm:w-6",
                  node.state === "complete" ? "bg-emerald-300" : "bg-border",
                )}
                aria-hidden
              />
            )}
          </li>
        ))}
      </ol>
    </div>
  );
}
