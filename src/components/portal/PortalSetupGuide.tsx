import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type {
  ClientSetupReadiness,
  ClientSetupStep,
  SetupStepStatus,
} from "@/lib/client-setup-readiness";

function statusLabel(step: ClientSetupStep): string {
  if (step.status === "complete") return "Complete";
  if (step.status === "not_required") return "Not required";
  if (step.status === "attention") return "Needs attention";
  if (step.owner === "admin") return "Waiting on Hargen";
  if (step.owner === "system" || step.owner === "stripe") return "In progress";
  return "Needs action";
}

function statusVariant(status: SetupStepStatus): "default" | "secondary" | "destructive" | "outline" {
  if (status === "complete") return "default";
  if (status === "blocked") return "destructive";
  if (status === "attention") return "secondary";
  return "outline";
}

function blockerLabel(step: ClientSetupStep): string {
  if (step.blockers.includes("blocks_submit")) return "Send work blocked";
  if (step.blockers.includes("blocks_billing")) return "Billing pending";
  if (step.blockers.includes("blocks_invite")) return "Invite pending";
  return "Informational";
}

export function PortalSetupGuide({ readiness }: { readiness: ClientSetupReadiness }) {
  return (
    <Card className="border-blue-200 bg-blue-50/30">
      <CardHeader className="space-y-3">
        <CardTitle className="text-lg text-blue-900">Setup guide</CardTitle>
        <div className="flex flex-wrap gap-2">
          <Badge variant={readiness.canSubmitPortalWork ? "default" : "destructive"}>
            {readiness.canSubmitPortalWork ? "Send work ready" : "Send work blocked"}
          </Badge>
          <Badge variant={readiness.billingReady ? "outline" : "secondary"}>
            Billing: {readiness.billing.customerStatusLabel}
          </Badge>
          <Badge variant={readiness.systemAccessReady ? "outline" : "secondary"}>
            System access: {readiness.systemAccess.status.replace(/_/g, " ")}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {readiness.customerSteps.map((step) => (
          <div key={step.id} className="rounded-md border bg-white p-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="text-sm font-semibold">{step.title}</p>
              <Badge variant={statusVariant(step.status)}>{statusLabel(step)}</Badge>
            </div>
            {step.description && (
              <p className="mt-2 text-xs text-muted-foreground">{step.description}</p>
            )}
            <div className="mt-3 flex flex-wrap items-center gap-2">
              <Badge variant="outline" className="text-[11px]">
                {blockerLabel(step)}
              </Badge>
              {step.actionHref && step.actionLabel && (
                <Link
                  href={step.actionHref}
                  className={cn(
                    buttonVariants({ variant: "link", size: "sm" }),
                    "h-auto px-0 text-xs",
                  )}
                >
                  {step.actionLabel}
                </Link>
              )}
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
