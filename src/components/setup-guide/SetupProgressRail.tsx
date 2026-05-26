import { Check } from "lucide-react";
import { cn } from "@/lib/utils";
import type { SetupRailNode } from "./setup-guide-utils";
import { railStateTone } from "./setup-guide-utils";

type SetupProgressRailProps = {
  nodes: SetupRailNode[];
  onNodeClick?: (nodeId: string) => void;
};

export function SetupProgressRail({ nodes, onNodeClick }: SetupProgressRailProps) {
  return (
    <div className="overflow-x-auto pb-1 -mx-1 px-1">
      <ol className="flex min-w-max items-center gap-1 sm:gap-2">
        {nodes.map((node, index) => {
          const pillClass = cn(
            "flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium whitespace-nowrap transition-colors sm:px-3 sm:py-1.5 sm:text-sm",
            railStateTone(node.state),
            onNodeClick && "cursor-pointer hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-400",
          );

          const content = (
            <>
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
            </>
          );

          return (
            <li key={node.id} className="flex items-center gap-1 sm:gap-2">
              {onNodeClick ? (
                <button
                  type="button"
                  className={pillClass}
                  onClick={() => onNodeClick(node.id)}
                  aria-label={`Open ${node.label} setup step`}
                >
                  {content}
                </button>
              ) : (
                <div className={pillClass}>{content}</div>
              )}
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
          );
        })}
      </ol>
    </div>
  );
}
