import { Suspense } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { ProspectCommandCenter } from "@/components/admin/ProspectCommandCenter";
import { ProspectDetailTabs } from "@/components/admin/client-detail/ProspectDetailTabs";
import { ProspectAccessBillingPanel } from "@/components/admin/client-detail/ProspectAccessBillingPanel";
import { DiscoveryClientPanel } from "@/components/onboarding/DiscoveryClientPanel";
import {
  BrandingCard,
  SystemAccessCard,
} from "@/components/admin/client-detail/client-detail-sections";
import type { DiscoverySchedulingReadiness } from "@/lib/discovery-scheduling/scheduling-readiness";
import {
  Client,
  ClientSystemAccess,
  RequestStatus,
  EngagementType,
  DiscoverySchedulingLinkStatus,
  DiscoveryAppointmentStatus,
  DiscoveryFitDecision,
  GoogleCalendarSyncStatus,
} from "@/generated/prisma/client";
import type { ServiceModelTypeValue } from "@/lib/client-service-model";
import { ClientEngagementManager } from "@/components/admin/ClientEngagementManager";
import type { ActivationBlocker } from "@/lib/client-activation-readiness";

type DiscoveryRequest = {
  id: string;
  title: string;
  supportNeeded: string | null;
  description: string;
  mostHelpful: string | null;
  urgency: string;
  status: RequestStatus;
  internalNotes: string | null;
  clientVisibleUpdate: string | null;
  createdAt: Date;
  requestedTasks: Array<{ name: string; description?: string | null }>;
};

type ProspectOnboardingViewProps = {
  client: Client & {
    engagementType: EngagementType;
    billingOverrideCreatedBy?: { name: string | null; email: string } | null;
    users: { id: string; email: string; name: string | null }[];
    approvedWorkTasks: { workTaskId: string }[];
    serviceModels?: { modelType: ServiceModelTypeValue; isActive: boolean }[];
  };
  latestDiscovery: {
    id: string;
    status: RequestStatus;
    clientVisibleUpdate: string | null;
  } | null;
  discoveryRequestForDrawer: DiscoveryRequest | null;
  discoveryMetadata: { intakePlan?: string } | null;
  schedulingReadiness: DiscoverySchedulingReadiness;
  schedulingLink: {
    status: DiscoverySchedulingLinkStatus;
    sentAt: Date | null;
    openedAt: Date | null;
    expiresAt: Date | null;
  } | null;
  latestAppointment: {
    id: string;
    status: DiscoveryAppointmentStatus;
    canceledAt: Date | null;
    scheduledStartUtc: Date;
    scheduledEndUtc: Date;
    timezone: string;
    meetingUrl: string | null;
    discoveryNotes: string | null;
    fitDecision: DiscoveryFitDecision | null;
    fitDecisionReason: string | null;
    recapContent: string | null;
    recapSentAt: Date | null;
    googleSyncStatus: GoogleCalendarSyncStatus;
    googleSyncError: string | null;
  } | null;
  showPreActivationTabs: boolean;
  suggestedWorkTaskIds: string[];
  discoveryPlanRequestBased: boolean;
  catalogCategories: Parameters<typeof ClientEngagementManager>[0]["categories"];
  decryptedSystemAccesses: ClientSystemAccess[];
  systemAccessLoadError: string | null;
  canActivate: boolean;
  activationBlockers: ActivationBlocker[];
};

export function ProspectOnboardingView({
  client,
  latestDiscovery,
  discoveryRequestForDrawer,
  discoveryMetadata,
  schedulingReadiness,
  schedulingLink,
  latestAppointment,
  showPreActivationTabs,
  suggestedWorkTaskIds,
  discoveryPlanRequestBased,
  catalogCategories,
  decryptedSystemAccesses,
  systemAccessLoadError,
  canActivate,
  activationBlockers,
}: ProspectOnboardingViewProps) {
  const engagementPanel = (
    <ClientEngagementManager
      clientId={client.id}
      engagementType={client.engagementType}
      serviceModels={client.serviceModels?.filter((m) => m.isActive).map((m) => m.modelType) ?? []}
      approvedWorkTaskIds={client.approvedWorkTasks.map((a) => a.workTaskId)}
      suggestedWorkTaskIds={suggestedWorkTaskIds}
      categories={catalogCategories}
      discoveryPlanRequestBased={discoveryPlanRequestBased}
    />
  );

  return (
    <>
      {latestDiscovery ? (
        <ProspectCommandCenter
          clientId={client.id}
          clientStatus={client.status}
          supportRequestId={latestDiscovery.id}
          requestStatus={latestDiscovery.status}
          linkStatus={schedulingLink?.status ?? null}
          appointmentStatus={latestAppointment?.status ?? null}
          fitDecision={latestAppointment?.fitDecision ?? null}
          recapSentAt={latestAppointment?.recapSentAt ?? null}
          readiness={schedulingReadiness}
          prospectEmail={client.email}
          contactName={client.contactName}
          companyName={client.companyName}
          clientVisibleUpdate={latestDiscovery.clientVisibleUpdate}
          showPreActivationTabs={showPreActivationTabs}
          canActivate={canActivate}
          activationBlockers={activationBlockers}
        />
      ) : null}

      <Suspense
        fallback={
          <div className="h-10 max-w-2xl animate-pulse rounded-lg bg-muted" aria-hidden />
        }
      >
        <ProspectDetailTabs
          clientId={client.id}
          showSetupTab={showPreActivationTabs}
          showBillingTab={showPreActivationTabs}
          discovery={
            discoveryRequestForDrawer ? (
              <div id="discovery-workspace">
                <DiscoveryClientPanel
                  intakeClient={{
                    companyName: client.companyName,
                    contactName: client.contactName,
                    email: client.email,
                    phone: client.phone,
                    role: client.role,
                    website: client.website,
                    serviceArea: client.serviceArea,
                    currentTools: client.currentTools,
                  }}
                  discoveryMetadata={discoveryMetadata}
                  latestDiscoveryRequest={discoveryRequestForDrawer}
                  schedulingReadiness={schedulingReadiness}
                  schedulingLink={schedulingLink}
                  appointment={
                    latestAppointment
                      ? {
                          id: latestAppointment.id,
                          status: latestAppointment.status,
                          canceledAt: latestAppointment.canceledAt,
                          scheduledStartUtc: latestAppointment.scheduledStartUtc,
                          scheduledEndUtc: latestAppointment.scheduledEndUtc,
                          timezone: latestAppointment.timezone,
                          meetingUrl: latestAppointment.meetingUrl,
                          discoveryNotes: latestAppointment.discoveryNotes,
                          fitDecision: latestAppointment.fitDecision,
                          fitDecisionReason: latestAppointment.fitDecisionReason,
                          recapContent: latestAppointment.recapContent,
                          recapSentAt: latestAppointment.recapSentAt,
                          googleSyncStatus: latestAppointment.googleSyncStatus,
                          googleSyncError: latestAppointment.googleSyncError,
                        }
                      : null
                  }
                />
              </div>
            ) : (
              <Card>
                <CardContent className="py-8 text-center text-sm text-muted-foreground">
                  Discovery intake data is unavailable for this client.
                </CardContent>
              </Card>
            )
          }
          setup={
            <div className="space-y-8 max-w-3xl">
              {systemAccessLoadError && (
                <Card className="border-amber-200 bg-amber-50/40">
                  <CardContent className="py-4 text-sm text-amber-900">
                    {systemAccessLoadError}
                  </CardContent>
                </Card>
              )}
              {engagementPanel}
              <SystemAccessCard clientId={client.id} records={decryptedSystemAccesses} />
              <BrandingCard client={client} />
            </div>
          }
          billing={
            <ProspectAccessBillingPanel
              client={{
                id: client.id,
                status: client.status,
                email: client.email,
                contactName: client.contactName,
                engagementType: client.engagementType,
                billingMode: client.billingMode,
                billingOverrideReason: client.billingOverrideReason,
                billingOverrideExpiresAt: client.billingOverrideExpiresAt,
                billingOverrideCreatedAt: client.billingOverrideCreatedAt,
                billingOverrideCreatedById: client.billingOverrideCreatedById,
                billingOverrideCreatedByName: client.billingOverrideCreatedBy?.name ?? null,
                billingOverrideCreatedByEmail: client.billingOverrideCreatedBy?.email ?? null,
                weeklyHours: client.weeklyHours,
                hourlyRateCents: client.hourlyRateCents,
                subscriptionStatus: client.subscriptionStatus,
                stripeCustomerId: client.stripeCustomerId,
                stripeSubscriptionId: client.stripeSubscriptionId,
                subscriptionCurrentPeriodEnd: client.subscriptionCurrentPeriodEnd,
                users: client.users,
              }}
            />
          }
        />
      </Suspense>
    </>
  );
}
