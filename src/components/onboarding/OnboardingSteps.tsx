/**
 * Prospect setup actions not covered by guided setup sheets.
 * Billing, portal invite, and engagement are opened from the setup guide rail.
 */

"use client";

import { useRouter } from "next/navigation";
import { Link as LinkIcon } from "lucide-react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ClientStatus, RequestStatus } from "@/lib/enums";
import { EngagementType } from "@/generated/prisma/client";
import { getQualificationStatusLabel } from "@/lib/request-lifecycle";

interface OnboardingStepsProps {
  client: {
    id: string;
    status: ClientStatus;
    engagementType: EngagementType;
  };
  latestWalkthroughRequest?: {
    id: string;
    title: string;
    status: RequestStatus;
    createdAt: Date;
  } | null;
}

export function OnboardingSteps({
  client,
  latestWalkthroughRequest,
}: OnboardingStepsProps) {
  const router = useRouter();
  const isActive = client.status === ClientStatus.ACTIVE;

  const handleOpenWalkthrough = () => {
    const url = new URL(window.location.href);
    url.searchParams.set("open", "walkthrough");
    router.push(url.pathname + url.search);
  };

  return (
    <Card className="border-primary/20">
      <CardHeader>
        <CardTitle>Walkthrough</CardTitle>
        <p className="text-sm text-muted-foreground">
          Use the guided setup rail above for billing, scope, and portal invite. Review the
          walkthrough request here.
        </p>
      </CardHeader>
      <CardContent className="space-y-6">
        <section className="space-y-3">
          <div className="flex items-center gap-2">
            <LinkIcon className="h-4 w-4 text-primary" aria-hidden />
            <h3 className="text-sm font-semibold">Qualify</h3>
          </div>
          <p className="text-sm text-muted-foreground">
            {latestWalkthroughRequest
              ? getQualificationStatusLabel(latestWalkthroughRequest.status)
              : "No walkthrough request yet."}
          </p>
          {latestWalkthroughRequest ? (
            <Button variant="outline" size="sm" onClick={handleOpenWalkthrough}>
              Review walkthrough
            </Button>
          ) : (
            <p className="text-xs text-muted-foreground italic">
              Waiting for walkthrough request.
            </p>
          )}
        </section>

        {!isActive && (
          <section className="space-y-2 rounded-md border border-dashed p-4 text-sm text-muted-foreground">
            <p>
              Activation, engagement, billing, and portal invite are available from the guided
              setup steps above — click a rail pill or the next-step action to open each panel.
            </p>
          </section>
        )}
      </CardContent>
    </Card>
  );
}
