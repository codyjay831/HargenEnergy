import { Suspense } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ClientCommandBar } from "@/components/admin/ClientCommandBar";
import { ClientDetailTabs } from "@/components/admin/ClientDetailTabs";
import { ClientWorkTab } from "@/components/admin/client-work/ClientWorkTab";
import { DiscoveryClientPanel } from "@/components/onboarding/DiscoveryClientPanel";
import {
  BillingCard,
  BrandingCard,
  CompanyDetailsCard,
  PortalAccessCard,
  RecentRequestsCard,
  SystemAccessCard,
  UsageCard,
} from "@/components/admin/client-detail/client-detail-sections";
import type { ClientSetupReadiness } from "@/lib/client-setup-readiness";
import type { DiscoverySchedulingReadiness } from "@/lib/discovery-scheduling/scheduling-readiness";
import type { WeeklyUsage } from "@/lib/usage";
import {
  ACTIVE_DEFAULT_TAB,
  type AdminClientTab,
} from "@/lib/admin-client-tabs";
import {
  Client,
  ClientSystemAccess,
  EngagementType,
  RequestStatus,
  SupportRequest,
  TimeEntry,
  DiscoverySchedulingLinkStatus,
  DiscoveryAppointmentStatus,
  DiscoveryFitDecision,
  GoogleCalendarSyncStatus,
} from "@/generated/prisma/client";
import type { ServiceModelTypeValue } from "@/lib/client-service-model";
import { ClientEngagementManager } from "@/components/admin/ClientEngagementManager";
import type { ClientBlockWorkData } from "@/lib/block-work";

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

type ActiveClientViewProps = {
  client: Client & {
    engagementType: EngagementType;
    billingOverrideCreatedBy?: { name: string | null; email: string } | null;
    users: { id: string; email: string; name: string | null }[];
    approvedWorkTasks: { workTaskId: string }[];
    serviceModels?: { modelType: ServiceModelTypeValue; isActive: boolean }[];
    requests: SupportRequest[];
    timeEntries: TimeEntry[];
  };
  defaultTab?: AdminClientTab;
  setupReadiness: ClientSetupReadiness;
  openRequestCount: number;
  usage: WeeklyUsage;
  showWorkTab: boolean;
  showDiscoveryTab: boolean;
  blockWorkData: ClientBlockWorkData;
  workTabRequests: Array<{
    id: string;
    title: string;
    status: RequestStatus;
    createdAt: Date;
    supportNeeded: string | null;
  }>;
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
  suggestedWorkTaskIds: string[];
  discoveryPlanRequestBased: boolean;
  catalogCategories: Parameters<typeof ClientEngagementManager>[0]["categories"];
  decryptedSystemAccesses: ClientSystemAccess[];
  systemAccessLoadError: string | null;
  approvedWorkTaskCount: number;
};

export function ActiveClientView({
  client,
  defaultTab = ACTIVE_DEFAULT_TAB,
  setupReadiness,
  openRequestCount,
  usage,
  showWorkTab,
  showDiscoveryTab,
  blockWorkData,
  workTabRequests,
  discoveryRequestForDrawer,
  discoveryMetadata,
  schedulingReadiness,
  schedulingLink,
  latestAppointment,
  suggestedWorkTaskIds,
  discoveryPlanRequestBased,
  catalogCategories,
  decryptedSystemAccesses,
  systemAccessLoadError,
  approvedWorkTaskCount,
}: ActiveClientViewProps) {
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
      <ClientCommandBar
        readiness={setupReadiness}
        openRequestCount={openRequestCount}
        hoursUsed={usage.includedMinutesThisWeek / 60}
        hoursReserved={client.weeklyHours}
        isNearLimit={usage.isNearLimit}
        isOverLimit={usage.isOverLimit}
        client={{
          id: client.id,
          companyName: client.companyName,
          contactName: client.contactName,
          email: client.email,
          phone: client.phone,
          role: client.role,
          website: client.website,
          serviceArea: client.serviceArea,
          currentTools: client.currentTools,
          status: client.status,
          planType: client.planType,
          weeklyHours: client.weeklyHours,
          hourlyRateCents: client.hourlyRateCents,
          engagementType: client.engagementType,
          serviceModels:
            client.serviceModels?.filter((m) => m.isActive).map((m) => m.modelType) ?? [],
          billingMode: client.billingMode,
          billingOverrideReason: client.billingOverrideReason,
          billingOverrideExpiresAt: client.billingOverrideExpiresAt,
          billingOverrideCreatedAt: client.billingOverrideCreatedAt,
          billingOverrideCreatedById: client.billingOverrideCreatedById,
          billingOverrideCreatedByName: client.billingOverrideCreatedBy?.name ?? null,
          billingOverrideCreatedByEmail: client.billingOverrideCreatedBy?.email ?? null,
          subscriptionStatus: client.subscriptionStatus,
          stripeCustomerId: client.stripeCustomerId,
          stripeSubscriptionId: client.stripeSubscriptionId,
          subscriptionCurrentPeriodEnd: client.subscriptionCurrentPeriodEnd,
          agreementStatus: client.agreementStatus,
          agreementSentAt: client.agreementSentAt,
          agreementSignedAt: client.agreementSignedAt,
          agreementUrl: client.agreementUrl,
          agreementNotes: client.agreementNotes,
          agreementOverrideReason: client.agreementOverrideReason,
          approvedWorkTaskCount,
          users: client.users,
        }}
        engagement={{
          approvedWorkTaskIds: client.approvedWorkTasks.map((a) => a.workTaskId),
          suggestedWorkTaskIds,
          categories: catalogCategories,
          discoveryPlanRequestBased,
        }}
        systemAccessRecords={decryptedSystemAccesses}
        adminRequestsHref={`/admin/requests?clientId=${client.id}`}
        canActivate={setupReadiness.canActivate}
        activationBlockers={setupReadiness.activationBlockers}
      />

      <Suspense
        fallback={
          <div className="h-10 max-w-2xl animate-pulse rounded-lg bg-muted" aria-hidden />
        }
      >
        <ClientDetailTabs
          clientId={client.id}
          defaultTab={defaultTab}
          showDiscoveryTab={showDiscoveryTab}
          showWorkTab={showWorkTab}
          showSetupTab
          showBillingTab
          work={
            showWorkTab ? (
              <ClientWorkTab
                clientId={client.id}
                items={blockWorkData.items}
                timeline={blockWorkData.timeline}
                requests={workTabRequests}
              />
            ) : null
          }
          overview={
            <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
              <div className="lg:col-span-2 space-y-6">
                <RecentRequestsCard
                  requests={client.requests}
                  showWorkTab={showWorkTab}
                  clientId={client.id}
                />
                <CompanyDetailsCard client={client} />
                {client.notes && (
                  <Card>
                    <CardHeader>
                      <CardTitle>Internal Notes</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="text-sm text-slate-700 whitespace-pre-wrap">{client.notes}</p>
                    </CardContent>
                  </Card>
                )}
              </div>
              <div className="space-y-6">
                {client.engagementType === EngagementType.SUPPORT_BLOCK && (
                  <UsageCard client={client} usage={usage} />
                )}
              </div>
            </div>
          }
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
            <div className="space-y-8 max-w-3xl">
              <BillingCard client={client} />
              <PortalAccessCard client={client} />
            </div>
          }
        />
      </Suspense>
    </>
  );
}
