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
  if (step.owner === "customer") return "Waiting on customer";
  if (step.owner === "system" || step.owner === "stripe") return "Waiting on Hargen";
  return "Needs action";
}

function statusVariant(status: SetupStepStatus): "default" | "secondary" | "destructive" | "outline" {
  if (status === "complete") return "default";
  if (status === "blocked") return "destructive";
  if (status === "attention") return "secondary";
  return "outline";
}

function blockerLabel(step: ClientSetupStep): string {
  if (step.blockers.includes("blocks_invite")) return "Blocks invite";
  if (step.blockers.includes("blocks_submit")) return "Blocks submit";
  if (step.blockers.includes("blocks_billing")) return "Blocks billing";
  return "Informational";
}

export function ClientSetupGuide({ readiness }: { readiness: ClientSetupReadiness }) {
  return (
    <Card className="border-primary/20">
      <CardHeader className="space-y-3">
        <CardTitle className="text-lg">Guided setup</CardTitle>
        <div className="flex flex-wrap gap-2">
          <Badge variant={readiness.canInvitePortal ? "default" : "destructive"}>
            {readiness.canInvitePortal ? "Invite ready" : "Invite blocked"}
          </Badge>
          <Badge variant={readiness.canSubmitPortalWork ? "default" : "destructive"}>
            {readiness.canSubmitPortalWork ? "Submit ready" : "Submit blocked"}
          </Badge>
          <Badge variant={readiness.billingReady ? "outline" : "secondary"}>
            Billing: {readiness.billing.statusLabel}
          </Badge>
        </div>
        {readiness.blockingMessages.length > 0 && (
          <div className="space-y-1 rounded-md border border-amber-200 bg-amber-50 p-3 text-xs text-amber-900">
            {readiness.blockingMessages.map((message) => (
              <p key={message}>{message}</p>
            ))}
          </div>
        )}
      </CardHeader>
      <CardContent className="space-y-3">
        {readiness.adminSteps.map((step) => (
          <div key={step.id} className="rounded-md border p-3">
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
              <Badge variant="outline" className="text-[11px]">
                Owner: {step.owner}
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
