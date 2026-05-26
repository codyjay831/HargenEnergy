import { Badge } from "@/components/ui/badge";
import {
  buildIntakeSnapshotFields,
  type IntakeSnapshotClient,
  type IntakeSnapshotMetadata,
  type IntakeSnapshotRequest,
} from "@/lib/intake-snapshot";

interface IntakeLeadSnapshotProps {
  client: IntakeSnapshotClient;
  request: IntakeSnapshotRequest;
  metadata?: IntakeSnapshotMetadata | null;
}

function SnapshotLabel({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <span
      className={`text-xs font-semibold uppercase tracking-wider ${className ?? "text-muted-foreground"}`}
    >
      {children}
    </span>
  );
}

export function IntakeLeadSnapshot({ client, request, metadata }: IntakeLeadSnapshotProps) {
  const fields = buildIntakeSnapshotFields({ client, request, metadata });

  const multilineLabels = new Set(["Bottleneck", "First priority this week", "Current tools"]);
  const textFields = fields.filter(
    (f) => f.label !== "Support areas" && !multilineLabels.has(f.label),
  );
  const multilineFields = fields.filter((f) => multilineLabels.has(f.label));

  return (
    <div className="space-y-6">
      {(request.requestedTasks?.length ?? 0) > 0 ? (
        <div>
          <SnapshotLabel>Support areas</SnapshotLabel>
          <div className="mt-2 space-y-2">
            {request.requestedTasks!.map((task) => (
              <div key={task.name} className="rounded-md border bg-muted/30 px-3 py-2">
                <p className="text-sm font-medium text-slate-900">{task.name}</p>
                {task.description ? (
                  <p className="mt-1 text-sm text-muted-foreground">{task.description}</p>
                ) : null}
              </div>
            ))}
          </div>
        </div>
      ) : request.supportNeeded ? (
        <div>
          <SnapshotLabel>Support areas</SnapshotLabel>
          <div className="mt-1 flex flex-wrap gap-2">
            {request.supportNeeded.split(", ").map((item, i) => (
              <Badge key={i} variant="secondary">
                {item}
              </Badge>
            ))}
          </div>
        </div>
      ) : null}

      {multilineFields.map((field) => (
        <div key={field.label}>
          <SnapshotLabel>{field.label}</SnapshotLabel>
          <p className="mt-1 text-slate-900 whitespace-pre-wrap">{field.value}</p>
        </div>
      ))}

      {textFields.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4 border-t">
          {textFields.map((field) => (
            <div key={field.label}>
              <SnapshotLabel>{field.label}</SnapshotLabel>
              <p className="mt-1 text-sm font-medium text-slate-900">{field.value}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
