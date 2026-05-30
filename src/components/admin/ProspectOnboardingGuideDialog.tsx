"use client";

import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import type { DiscoveryPipelineStage } from "@/lib/discovery-scheduling/pipeline";
import {
  PROSPECT_NOT_AVAILABLE,
  PROSPECT_ONBOARDING_ACTIONS,
  PROSPECT_ONBOARDING_OVERVIEW,
  PROSPECT_ONBOARDING_PHASES,
  PROSPECT_ONBOARDING_STAGES,
  PROSPECT_ONBOARDING_TABS,
  PROSPECT_OPTIONAL_ITEMS,
  PROSPECT_RECOMMENDED_BEFORE_ACTIVATION,
  PROSPECT_SCHEDULING_REQUIREMENTS,
} from "@/lib/prospect-onboarding-guide";
import { cn } from "@/lib/utils";

type ProspectOnboardingGuideDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  currentStage?: DiscoveryPipelineStage;
};

function GuideSection({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="space-y-2">
      <h3 className="text-sm font-semibold text-foreground">{title}</h3>
      {children}
    </section>
  );
}

function BulletList({ items }: { items: string[] }) {
  return (
    <ul className="list-disc space-y-1 pl-4 text-sm text-muted-foreground">
      {items.map((item) => (
        <li key={item}>{item}</li>
      ))}
    </ul>
  );
}

export function ProspectOnboardingGuideDialog({
  open,
  onOpenChange,
  currentStage,
}: ProspectOnboardingGuideDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>How prospect onboarding works</DialogTitle>
          <DialogDescription>
            Reference guide for the discovery-to-activation flow on this page.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 pr-1">
          <GuideSection title="Overview">
            <p className="text-sm text-muted-foreground leading-relaxed">
              {PROSPECT_ONBOARDING_OVERVIEW}
            </p>
          </GuideSection>

          <GuideSection title="The four phases">
            <div className="space-y-2">
              {PROSPECT_ONBOARDING_PHASES.map((phase) => (
                <div
                  key={phase.id}
                  className={cn(
                    "rounded-md border px-3 py-2.5 text-sm",
                    currentStage && phase.stages.includes(currentStage)
                      ? "border-sky-300 bg-sky-50/60"
                      : "border-border bg-muted/20",
                  )}
                >
                  <div className="flex items-center gap-2">
                    <span className="font-medium">{phase.label}</span>
                    {currentStage && phase.stages.includes(currentStage) && (
                      <Badge variant="secondary" className="text-xs">
                        You are here
                      </Badge>
                    )}
                  </div>
                  <p className="mt-1 text-muted-foreground">{phase.summary}</p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    <span className="font-medium text-foreground/80">Admin work: </span>
                    {phase.adminWork}
                  </p>
                </div>
              ))}
            </div>
          </GuideSection>

          <GuideSection title="Stages">
            <div className="space-y-1.5">
              {PROSPECT_ONBOARDING_STAGES.map((row) => {
                const isCurrent = currentStage === row.stage;
                return (
                  <div
                    key={row.stage}
                    className={cn(
                      "flex flex-col gap-0.5 rounded-md px-2 py-1.5 sm:flex-row sm:items-start sm:gap-3",
                      isCurrent && "bg-sky-50 ring-1 ring-sky-200",
                    )}
                  >
                    <span
                      className={cn(
                        "shrink-0 text-sm font-medium sm:w-36",
                        isCurrent ? "text-sky-900" : "text-foreground",
                      )}
                    >
                      {row.label}
                      {isCurrent && (
                        <span className="ml-1.5 text-xs font-normal text-sky-700">
                          (current)
                        </span>
                      )}
                    </span>
                    <span className="text-sm text-muted-foreground">{row.description}</span>
                  </div>
                );
              })}
            </div>
          </GuideSection>

          <GuideSection title="Actions">
            <dl className="space-y-2.5">
              {PROSPECT_ONBOARDING_ACTIONS.map((action) => (
                <div key={action.id} className="text-sm">
                  <dt className="font-medium">{action.label}</dt>
                  <dd className="mt-0.5 text-muted-foreground">{action.description}</dd>
                </div>
              ))}
            </dl>
          </GuideSection>

          <GuideSection title="Required vs optional">
            <div className="space-y-4">
              <div>
                <p className="mb-1.5 text-xs font-medium uppercase tracking-wide text-foreground/70">
                  Required for scheduling link
                </p>
                <BulletList items={PROSPECT_SCHEDULING_REQUIREMENTS} />
              </div>
              <div>
                <p className="mb-1.5 text-xs font-medium uppercase tracking-wide text-foreground/70">
                  Recommended before activation
                </p>
                <BulletList items={PROSPECT_RECOMMENDED_BEFORE_ACTIVATION} />
              </div>
              <div>
                <p className="mb-1.5 text-xs font-medium uppercase tracking-wide text-foreground/70">
                  Optional
                </p>
                <BulletList items={PROSPECT_OPTIONAL_ITEMS} />
              </div>
              <div>
                <p className="mb-1.5 text-xs font-medium uppercase tracking-wide text-foreground/70">
                  Not available on this page
                </p>
                <BulletList items={PROSPECT_NOT_AVAILABLE} />
              </div>
            </div>
          </GuideSection>

          <GuideSection title="Tabs on this page">
            <dl className="space-y-2.5">
              {PROSPECT_ONBOARDING_TABS.map((tab) => (
                <div key={tab.id} className="text-sm">
                  <dt className="font-medium">
                    {tab.label}
                    <span className="ml-2 text-xs font-normal text-muted-foreground">
                      {tab.whenVisible}
                    </span>
                  </dt>
                  <dd className="mt-0.5 text-muted-foreground">{tab.description}</dd>
                </div>
              ))}
            </dl>
          </GuideSection>
        </div>
      </DialogContent>
    </Dialog>
  );
}
