import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CreditCard } from "lucide-react";
import { PortalBillingPortalButton } from "@/components/forms/PortalBillingPortalButton";
import { PRODUCT_LANGUAGE } from "@/lib/product-language";
import type { ClientPortalSupportSetup } from "@/lib/portal-support";

interface PortalSupportSetupCardProps {
  setup: ClientPortalSupportSetup;
}

export function PortalSupportSetupCard({ setup }: PortalSupportSetupCardProps) {
  const copy = PRODUCT_LANGUAGE.supportSetup;

  return (
    <Card id="support-setup">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <CreditCard className="h-5 w-5 text-primary" />
          {copy.title}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="flex flex-col gap-1">
          <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
            Engagement model
          </span>
          <span className="text-sm font-medium">{setup.engagementLabel}</span>
        </div>

        {setup.isRequestBased ? (
          <p className="text-sm text-muted-foreground leading-relaxed">
            {copy.requestBasedExplainer}
          </p>
        ) : (
          <>
            <div className="flex items-center justify-between">
              <div className="flex flex-col">
                <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  Current block
                </span>
                <span className="text-lg font-bold">{setup.planType} Support Block</span>
              </div>
              <Badge
                variant={setup.subscriptionStatus === "active" ? "default" : "secondary"}
              >
                {setup.subscriptionStatus?.toUpperCase() || "PENDING"}
              </Badge>
            </div>

            <div className="flex flex-col">
              <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                Weekly reserved hours
              </span>
              <span className="text-sm font-medium">{setup.weeklyHours} hours per week</span>
            </div>

            <div className="space-y-3">
              <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                {copy.approvedAreasTitle}
              </span>
              {setup.supportAreas.length === 0 ? (
                <p className="text-sm text-muted-foreground">{copy.noApprovedAreas}</p>
              ) : (
                <div className="space-y-4">
                  {setup.supportAreas.map((area) => (
                    <div key={area.categoryName}>
                      <p className="text-sm font-semibold">{area.categoryName}</p>
                      <ul className="mt-1 list-disc pl-5 text-sm text-muted-foreground space-y-1">
                        {area.tasks.map((task) => (
                          <li key={task.id}>{task.name}</li>
                        ))}
                      </ul>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {setup.stripeCustomerId ? (
              <PortalBillingPortalButton />
            ) : (
              <div className="p-4 bg-slate-50 rounded-lg border border-slate-200">
                <p className="text-xs text-slate-600 leading-relaxed">
                  Retainer billing will appear here after your account manager enables Stripe
                  billing.
                </p>
              </div>
            )}
          </>
        )}

        <p className="text-xs text-muted-foreground leading-relaxed border-t pt-4">
          {copy.changeScopePrompt}
        </p>
      </CardContent>
    </Card>
  );
}
