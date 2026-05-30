import { prisma } from "@/lib/prisma";
import { notFound, redirect } from "next/navigation";
import { format } from "date-fns";
import {
  ClientStatus,
  Role,
  SupportRequestKind,
  ClientSystemAccess,
  EngagementType,
  RequestStatus,
} from "@/generated/prisma/client";
import type { ServiceModelTypeValue } from "@/lib/client-service-model";
import { getEngagementLabel } from "@/lib/engagement";
import { calculateWeeklyUsage } from "@/lib/usage";
import { ArchiveClientPanel } from "@/components/admin/ArchiveClientPanel";
import { DeleteClientPanel } from "@/components/admin/DeleteClientPanel";
import { ClientDetailHeader } from "@/components/admin/ClientDetailHeader";
import { DangerZoneAccordion } from "@/components/admin/DangerZoneAccordion";
import { ProspectOnboardingView } from "@/components/admin/client-detail/ProspectOnboardingView";
import { ActiveClientView } from "@/components/admin/client-detail/ActiveClientView";
import { getDiscoverySchedulingReadiness } from "@/lib/discovery-scheduling/scheduling-readiness";
import {
  deriveDiscoveryPipelineStage,
  pickDiscoveryAppointmentForPipeline,
} from "@/lib/discovery-scheduling/pipeline";
import { getClientSetupReadiness } from "@/lib/client-setup-readiness";
import { getClientSystemAccessForAdmin } from "@/app/actions/system-access";
import {
  ACTIVE_DEFAULT_TAB,
  adminClientTabHref,
  PROSPECT_DEFAULT_TAB,
  resolveProspectClientTab,
  resolveVisibleAdminClientTab,
} from "@/lib/admin-client-tabs";
import { hasServiceModel } from "@/lib/client-service-model";
import { loadClientBlockWork, toBlockWorkTaskOptions } from "@/lib/block-work";
import { isBlockWorkboardEnabled } from "@/lib/block-work-policy";
import { auth } from "@/auth";
import { resolveStaffRole } from "@/lib/permissions";
import type { Client, SupportRequest, TimeEntry } from "@/generated/prisma/client";

export const dynamic = "force-dynamic";

interface ClientDetailPageProps {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ tab?: string; open?: string }>;
}

type ClientWithRelations = Client & {
  billingOverrideCreatedBy?: { name: string | null; email: string } | null;
  users: { id: string; email: string; name: string | null }[];
  systemAccesses: ClientSystemAccess[];
  requests: SupportRequest[];
  timeEntries: TimeEntry[];
  approvedWorkTasks?: { workTaskId: string }[];
  serviceModels?: { modelType: ServiceModelTypeValue; isActive: boolean }[];
};

function mapDiscoveryRequestedTasks(
  rows: Array<{
    workTaskId: string;
    workTask: { id: string; name: string; description: string | null } | null;
  }>,
) {
  return rows.flatMap((row) => {
    if (!row.workTask) {
      return [];
    }
    return [
      {
        name: row.workTask.name,
        description: row.workTask.description,
      },
    ];
  });
}

export default async function ClientDetailPage({
  params,
  searchParams,
}: ClientDetailPageProps) {
  const resolvedParams = await params;
  const resolvedSearchParams = await searchParams;
  const id = typeof resolvedParams?.id === "string" ? resolvedParams.id : undefined;

  if (!id) {
    notFound();
  }

  const session = await auth();
  const isOwner =
    session?.user?.role === "ADMIN" &&
    resolveStaffRole(session.user.staffRole ?? null) === "OWNER";

  const client = (await prisma.client.findUnique({
    where: { id },
    include: {
      billingOverrideCreatedBy: {
        select: { name: true, email: true },
      },
      users: {
        where: { role: Role.CLIENT },
        select: { id: true, email: true, name: true },
      },
      approvedWorkTasks: { select: { workTaskId: true } },
      serviceModels: {
        select: { modelType: true, isActive: true },
      },
      systemAccesses: {
        orderBy: { createdAt: "asc" },
      },
      requests: {
        orderBy: { createdAt: "desc" },
        take: 5,
      },
      timeEntries: {
        orderBy: { date: "desc" },
        take: 10,
      },
    },
  })) as (ClientWithRelations & {
    engagementType: EngagementType;
    approvedWorkTasks: { workTaskId: string }[];
  }) | null;

  const catalogCategories = await prisma.serviceCategory.findMany({
    where: { isActive: true },
    include: {
      tasks: {
        where: { isActive: true },
        orderBy: { basePriority: "asc" },
        select: { id: true, name: true },
      },
    },
    orderBy: { name: "asc" },
  });

  if (!client) {
    notFound();
  }

  const isProspect = client.status === ClientStatus.LEAD;
  const isActive = client.status === ClientStatus.ACTIVE;
  const activeServiceModels =
    client.serviceModels?.filter((m) => m.isActive).map((m) => m.modelType) ?? [];
  const hasSupportBlock = hasServiceModel(activeServiceModels, "SUPPORT_BLOCK");
  const showWorkTab = isActive && hasSupportBlock && isBlockWorkboardEnabled();
  const usage = calculateWeeklyUsage(client.timeEntries, client.weeklyHours);

  const blockWorkData = showWorkTab
    ? await loadClientBlockWork(client.id)
    : { items: [], timeline: [] };
  const proofOfWorkTaskOptions = toBlockWorkTaskOptions(blockWorkData.items);
  const workTabRequests = client.requests
    .filter((r: SupportRequest) => r.kind === SupportRequestKind.CLIENT_OPS)
    .map((r) => ({
      id: r.id,
      title: r.title,
      status: r.status,
      createdAt: r.createdAt,
      supportNeeded: r.supportNeeded,
    }));

  const latestDiscovery = await prisma.supportRequest.findFirst({
    where: {
      clientId: client.id,
      kind: SupportRequestKind.PROSPECT_INTAKE,
    },
    orderBy: { createdAt: "desc" },
    include: {
      timeEntries: { orderBy: { date: "desc" }, take: 10 },
      requestedWorkTasks: {
        include: {
          workTask: {
            select: { id: true, name: true, description: true },
          },
        },
      },
      discoverySchedulingLink: true,
      discoveryAppointments: {
        orderBy: { createdAt: "desc" },
        take: 10,
      },
    },
  });

  const pipelineAppointment = latestDiscovery
    ? pickDiscoveryAppointmentForPipeline(latestDiscovery.discoveryAppointments)
    : null;
  const latestAppointment = pipelineAppointment;
  const schedulingLink = latestDiscovery?.discoverySchedulingLink ?? null;
  const schedulingReadiness = await getDiscoverySchedulingReadiness();

  const suggestedWorkTaskIds =
    latestDiscovery?.requestedWorkTasks.map((row) => row.workTaskId) ?? [];

  const discoveryRequestForDrawer = latestDiscovery
    ? {
        id: latestDiscovery.id,
        title: latestDiscovery.title,
        supportNeeded: latestDiscovery.supportNeeded,
        description: latestDiscovery.description,
        mostHelpful: latestDiscovery.mostHelpful,
        urgency: latestDiscovery.urgency,
        status: latestDiscovery.status,
        internalNotes: latestDiscovery.internalNotes,
        clientVisibleUpdate: latestDiscovery.clientVisibleUpdate,
        createdAt: latestDiscovery.createdAt,
        requestedTasks: mapDiscoveryRequestedTasks(latestDiscovery.requestedWorkTasks),
      }
    : null;

  const discoveryMetadata = latestDiscovery?.metadata as { intakePlan?: string } | null;
  const discoveryPlanRequestBased =
    discoveryMetadata?.intakePlan === "request-based" ||
    discoveryMetadata?.intakePlan === "one-time";
  const approvedWorkTaskCount = client.approvedWorkTasks.length;
  const setupReadinessResult = await getClientSetupReadiness(client.id);

  let decryptedSystemAccesses: ClientSystemAccess[] = [];
  let systemAccessLoadError: string | null = null;
  try {
    decryptedSystemAccesses = await getClientSystemAccessForAdmin(client.id);
  } catch (error) {
    console.error("Failed to load system access for admin client page:", {
      clientId: client.id,
      error,
    });
    systemAccessLoadError =
      "System access records could not be decrypted. Check FIELD_ENCRYPTION_KEY or contact support.";
  }

  if ("error" in setupReadinessResult) {
    notFound();
  }

  const setupReadiness = setupReadinessResult;
  const showDiscoveryTab = isProspect || setupReadiness.hasDiscoveryIntake;
  const discoveryStage =
    latestDiscovery == null
      ? null
      : deriveDiscoveryPipelineStage({
          clientStatus: client.status,
          requestStatus: latestDiscovery.status,
          linkStatus: schedulingLink?.status ?? null,
          appointmentStatus: latestAppointment?.status ?? null,
          fitDecision: latestAppointment?.fitDecision ?? null,
          recapSentAt: latestAppointment?.recapSentAt ?? null,
        });
  const showPreActivationTabs = isProspect && discoveryStage === "proposal_setup";
  const statusDateLabel =
    client.status === ClientStatus.ACTIVE && client.activatedAt
      ? `Active since ${format(new Date(client.activatedAt), "MMMM d, yyyy")}`
      : `Prospect since ${format(new Date(client.createdAt), "MMMM d, yyyy")}`;
  const openRequestCount = await prisma.supportRequest.count({
    where: {
      clientId: client.id,
      kind: SupportRequestKind.CLIENT_OPS,
      status: {
        notIn: [RequestStatus.COMPLETE, RequestStatus.CANCELLED],
      },
    },
  });

  const defaultTab = isProspect ? PROSPECT_DEFAULT_TAB : ACTIVE_DEFAULT_TAB;
  const resolvedTab = isProspect
    ? resolveProspectClientTab(resolvedSearchParams.tab, defaultTab, {
        showSetupTab: showPreActivationTabs,
        showBillingTab: showPreActivationTabs,
      })
    : resolveVisibleAdminClientTab(resolvedSearchParams.tab, defaultTab, {
        showDiscoveryTab,
        showWorkTab,
        showSetupTab: true,
        showBillingTab: true,
      });

  if (!resolvedSearchParams.tab || resolvedSearchParams.tab !== resolvedTab) {
    redirect(adminClientTabHref(id, resolvedTab));
  }

  const schedulingLinkProps = schedulingLink
    ? {
        status: schedulingLink.status,
        sentAt: schedulingLink.sentAt,
        openedAt: schedulingLink.openedAt,
        expiresAt: schedulingLink.expiresAt,
      }
    : null;

  const appointmentProps = latestAppointment
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
    : null;

  return (
    <div className="space-y-5">
      <ClientDetailHeader
        clientId={client.id}
        companyName={client.companyName}
        status={client.status}
        engagementType={client.engagementType}
        engagementLabel={getEngagementLabel(client.engagementType)}
        statusDateLabel={statusDateLabel}
        showProofOfWork={showWorkTab}
        proofOfWorkTaskOptions={proofOfWorkTaskOptions}
      />

      <div id="setup-guide" className="scroll-mt-8">
        {isProspect ? (
          <ProspectOnboardingView
            client={client}
            latestDiscovery={
              latestDiscovery
                ? {
                    id: latestDiscovery.id,
                    status: latestDiscovery.status,
                    clientVisibleUpdate: latestDiscovery.clientVisibleUpdate,
                  }
                : null
            }
            discoveryRequestForDrawer={discoveryRequestForDrawer}
            discoveryMetadata={discoveryMetadata}
            schedulingReadiness={schedulingReadiness}
            schedulingLink={schedulingLinkProps}
            latestAppointment={appointmentProps}
            showPreActivationTabs={showPreActivationTabs}
            suggestedWorkTaskIds={suggestedWorkTaskIds}
            discoveryPlanRequestBased={discoveryPlanRequestBased}
            catalogCategories={catalogCategories}
            decryptedSystemAccesses={decryptedSystemAccesses}
            systemAccessLoadError={systemAccessLoadError}
          />
        ) : (
          <ActiveClientView
            client={client}
            defaultTab={resolvedTab}
            setupReadiness={setupReadiness}
            openRequestCount={openRequestCount}
            usage={usage}
            showWorkTab={showWorkTab}
            showDiscoveryTab={showDiscoveryTab}
            blockWorkData={blockWorkData}
            workTabRequests={workTabRequests}
            discoveryRequestForDrawer={discoveryRequestForDrawer}
            discoveryMetadata={discoveryMetadata}
            schedulingReadiness={schedulingReadiness}
            schedulingLink={schedulingLinkProps}
            latestAppointment={appointmentProps}
            suggestedWorkTaskIds={suggestedWorkTaskIds}
            discoveryPlanRequestBased={discoveryPlanRequestBased}
            catalogCategories={catalogCategories}
            decryptedSystemAccesses={decryptedSystemAccesses}
            systemAccessLoadError={systemAccessLoadError}
            approvedWorkTaskCount={approvedWorkTaskCount}
          />
        )}
      </div>

      <DangerZoneAccordion>
        <ArchiveClientPanel
          clientId={client.id}
          companyName={client.companyName}
          status={client.status}
        />
        <DeleteClientPanel
          clientId={client.id}
          companyName={client.companyName}
          status={client.status}
          canDelete={isOwner}
          stripeSubscriptionId={client.stripeSubscriptionId}
        />
      </DangerZoneAccordion>
    </div>
  );
}
