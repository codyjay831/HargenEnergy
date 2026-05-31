import type { AgreementPacketSnapshot } from "@/lib/agreements/types";
import { snapshotToDocumentBlocks } from "@/lib/agreements/sections";
import { cn } from "@/lib/utils";

type AgreementPacketPreviewProps = {
  snapshot: AgreementPacketSnapshot;
  source?: "live" | "frozen";
  className?: string;
};

export function AgreementPacketPreview({
  snapshot,
  source = "frozen",
  className,
}: AgreementPacketPreviewProps) {
  const blocks = snapshotToDocumentBlocks(snapshot);

  return (
    <div className={cn("space-y-4", className)}>
      {source === "live" && (
        <div className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900">
          Draft preview — live data. Generate the packet to freeze the legal snapshot.
        </div>
      )}
      {source === "frozen" && (
        <div className="rounded-md border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-700">
          Frozen snapshot from {new Date(snapshot.generatedAt).toLocaleString()}.
        </div>
      )}

      <article className="rounded-lg border border-slate-200 bg-white p-6 md:p-8 space-y-4 max-w-3xl">
        {blocks.map((block, index) => {
          if (block.kind === "heading") {
            if (block.level === 1) {
              return (
                <h2
                  key={`${block.kind}-${index}`}
                  className="text-xl font-bold tracking-tight text-slate-900 pt-4 first:pt-0"
                >
                  {block.text}
                </h2>
              );
            }
            return (
              <h3
                key={`${block.kind}-${index}`}
                className="text-base font-semibold text-slate-900 pt-2"
              >
                {block.text}
              </h3>
            );
          }
          if (block.kind === "list") {
            return (
              <ul
                key={`${block.kind}-${index}`}
                className="list-disc pl-5 space-y-1 text-sm text-slate-700"
              >
                {(block.items ?? []).map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            );
          }
          return (
            <p key={`${block.kind}-${index}`} className="text-sm text-slate-700 leading-relaxed">
              {block.text}
            </p>
          );
        })}
      </article>
    </div>
  );
}
