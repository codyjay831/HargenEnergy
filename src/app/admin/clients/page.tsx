import { prisma } from "@/lib/prisma";
import { format } from "date-fns";
import { startOfWeek } from "date-fns";
import { Badge } from "@/components/ui/badge";
import Link from "next/link";
import { ClientStatus, RequestStatus, SupportRequestKind } from "@/generated/prisma/client";
import { cn } from "@/lib/utils";
import { PRODUCT_LANGUAGE } from "@/lib/product-language";
import { BillingStatusBadge } from "@/components/admin/BillingStatusBadge";
import {
  deriveDiscoveryPipelineStage,
  getDiscoveryPipelineStageBadgeVariant,
  getDiscoveryPipelineStageLabel,
  pickDiscoveryAppointmentForPipeline,
} from "@/lib/discovery-scheduling/pipeline";
import { calculateWeeklyUsage } from "@/lib/usage";
import {
  clientHealthBadgeClass,
  type ClientHealth,
} from "@/lib/admin-ui/status-badges";
import {
  adminBrandGlow,
  adminBrandGlowHover,
  adminBtnPrimary,
  adminPanelBorder,
} from "@/lib/admin-ui/tokens";
import { buttonVariants } from "@/components/ui/button";
import { ArrowUpRight, Users, UserCheck, ClipboardList } from "lucide-react";
import { EmptyState } from "@/components/ui/empty-state";

export const dynamic = "force-dynamic";

const PROSPECT_NEEDS_ATTENTION_STATUSES = [
  RequestStatus.NEW,
  RequestStatus.NEEDS_INFO,
] as const;

interface AdminClientsPageProps {
  searchParams: Promise<{ status?: string; needsReview?: string }>;
}

export default async function AdminClients({ searchParams }: AdminClientsPageProps) {
  const { status, needsReview } = await searchParams;
  const needsReviewFilter = needsReview === "1";
  const statusFilter =
    status === "LEAD" || status === "ACTIVE" || status === "ALL"
      ? status
      : needsReviewFilter
        ? "ALL"
        : "LEAD";

  const isOnboardingActive =
    !needsReviewFilter && (status === undefined || status === "LEAD");
  const isNeedsReviewActive = needsReviewFilter;
  const isActiveClientsTab = !needsReviewFilter && statusFilter === "ACTIVE";
  const isAllCompaniesActive = !needsReviewFilter && statusFilter === "ALL";

  const weekStart = startOfWeek(new Date(), { weekStartsOn: 1 });

  const clients = await prisma.client.findMany({
    where:
      statusFilter === "ALL"
        ? needsReviewFilter
          ? {
              requests: {
                some: {
                  kind: "PROSPECT_INTAKE",
                  status: { in: [...PROSPECT_NEEDS_ATTENTION_STATUSES] },
                },
              },
            }
          : undefined
        : needsReviewFilter
          ? {
              status: statusFilter as ClientStatus,
              requests: {
                some: {
                  kind: "PROSPECT_INTAKE",
                  status: { in: [...PROSPECT_NEEDS_ATTENTION_STATUSES] },
                },
              },
            }
          : { status: statusFilter as ClientStatus },
    include: {
      requests: isActiveClientsTab
        ? {
            where: {
              kind: SupportRequestKind.CLIENT_OPS,
              status: {
                notIn: [RequestStatus.COMPLETE, RequestStatus.CANCELLED],
              },
            },
            orderBy: [
              { needsInfo: "desc" },
              { priorityRank: "asc" },
              { createdAt: "desc" },
            ],
            take: 1,
            select: { id: true, title: true, needsInfo: true },
          }
        : {
            where: { kind: "PROSPECT_INTAKE" },
            orderBy: { createdAt: "desc" },
            take: 1,
            select: {
              id: true,
              title: true,
              status: true,
              discoverySchedulingLink: { select: { status: true } },
              discoveryAppointments: {
                orderBy: { createdAt: "desc" },
                take: 10,
                select: {
                  status: true,
                  fitDecision: true,
                  recapSentAt: true,
                  createdAt: true,
                },
              },
            },
          },
      // For active clients, load time entries for health derivation
      timeEntries: isActiveClientsTab
        ? { where: { date: { gte: weekStart } } }
        : false,
    },
    orderBy: { updatedAt: "desc" },
  });

  const pageSubtitle = needsReviewFilter
    ? "Discovery requests needing review or awaiting prospect response."
    : isActiveClientsTab
      ? "Your current active clients and their delivery status."
      : PRODUCT_LANGUAGE.prospect.listSubtitle;

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">Clients</h1>
          <p className="mt-0.5 text-sm text-slate-600">{pageSubtitle}</p>
        </div>
        {isActiveClientsTab && (
          <Link
            href="/admin/requests"
            className={cn(buttonVariants({ size: "sm" }), adminBtnPrimary)}
          >
            <ClipboardList className="h-3.5 w-3.5" />
            Work Queue
          </Link>
        )}
      </div>

      <div className="flex flex-wrap gap-1.5">
        <FilterTab href="/admin/clients" active={isOnboardingActive}>
          Onboarding
        </FilterTab>
        <FilterTab href="/admin/clients?needsReview=1&status=ALL" active={isNeedsReviewActive}>
          Needs review
        </FilterTab>
        <FilterTab href="/admin/clients?status=ACTIVE" active={isActiveClientsTab}>
          Active {PRODUCT_LANGUAGE.client.plural}
        </FilterTab>
        <FilterTab href="/admin/clients?status=ALL" active={isAllCompaniesActive}>
          All Companies
        </FilterTab>
      </div>

      {clients.length === 0 ? (
        <div className="rounded-xl border border-slate-200 bg-white p-12 text-center">
          <p className="text-sm text-slate-500">
            {needsReviewFilter
              ? "No discovery requests need review right now."
              : statusFilter === "LEAD"
                ? `No ${PRODUCT_LANGUAGE.prospect.plural.toLowerCase()} yet.`
                : statusFilter === "ACTIVE"
                  ? `No active ${PRODUCT_LANGUAGE.client.plural.toLowerCase()} yet. Activate a prospect after discovery to start delivery.`
                  : "No companies yet."}
          </p>
        </div>
      ) : isActiveClientsTab ? (
        /* ── Active clients: card rows ──────────────────────────────────── */
        <div className="space-y-2">
          {clients.map((client, index) => {
            const timeEntries = (client as { timeEntries?: { minutes: number; billableType: string; date: Date }[] }).timeEntries ?? [];
            const topRequest = client.requests[0] ?? null;
            const hasNeedsInfo = topRequest?.needsInfo ?? false;

            let health: ClientHealth = "Healthy";
            let usageLabel = "Unlimited";

            if (client.weeklyHours > 0 && timeEntries.length >= 0) {
              const usage = calculateWeeklyUsage(
                timeEntries as Parameters<typeof calculateWeeklyUsage>[0],
                client.weeklyHours,
              );
              if (usage.isOverLimit) health = "Over limit";
              else if (usage.isNearLimit) health = "Near limit";
              else if (hasNeedsInfo) health = "Needs info";
              usageLabel = `${(usage.includedMinutesThisWeek / 60).toFixed(1)} / ${client.weeklyHours}h`;
            } else if (hasNeedsInfo) {
              health = "Needs info";
            }

            const nextStep = topRequest?.title ?? (hasNeedsInfo ? "Awaiting client response" : "No open work");

            return (
              <Link
                key={client.id}
                href={`/admin/clients/${client.id}`}
                className={cn(
                  "grid gap-2 rounded-lg border border-slate-200 bg-white p-3 transition-all",
                  "sm:grid-cols-[1.5fr_1fr_1fr_auto_auto] sm:items-center",
                  adminBrandGlowHover,
                  index === 0 && adminBrandGlow,
                )}
              >
                <div className="min-w-0">
                  <p className="truncate font-semibold text-slate-900">
                    {client.companyName}
                  </p>
                  <p className="truncate text-xs text-slate-500">
                    {client.contactName}
                  </p>
                </div>
                <div className="min-w-0 text-xs text-slate-600">
                  <p className="font-medium text-slate-700">Next</p>
                  <p className="truncate">{nextStep}</p>
                </div>
                <p className="text-xs font-medium text-slate-600">{usageLabel}</p>
                <Badge
                  variant="outline"
                  className={cn(
                    "w-fit text-[10px] font-medium",
                    clientHealthBadgeClass(health),
                  )}
                >
                  {health}
                </Badge>
                <ArrowUpRight className="h-4 w-4 shrink-0 text-slate-400" />
              </Link>
            );
          })}
        </div>
      ) : (
        /* ── Other tabs: styled table ───────────────────────────────────── */
        <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50/70">
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Company
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Contact
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Pipeline
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Status
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Plan
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Subscription
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Created
                </th>
                <th className="w-24 px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {clients.map((client) => {
                const latestRequest = client.requests[0];
                const latestAppointment = latestRequest
                  ? pickDiscoveryAppointmentForPipeline(
                      latestRequest.discoveryAppointments,
                    )
                  : null;
                const pipelineStage =
                  client.status === ClientStatus.LEAD && latestRequest
                    ? deriveDiscoveryPipelineStage({
                        clientStatus: client.status,
                        requestStatus: latestRequest.status,
                        linkStatus:
                          latestRequest.discoverySchedulingLink?.status ?? null,
                        appointmentStatus: latestAppointment?.status ?? null,
                        fitDecision: latestAppointment?.fitDecision ?? null,
                        recapSentAt: latestAppointment?.recapSentAt ?? null,
                      })
                    : null;
                const hasUnreviewedDiscovery =
                  latestRequest?.status === "NEW" &&
                  !latestAppointment &&
                  latestRequest.discoverySchedulingLink?.status !== "ACTIVE";

                const clientHref = `/admin/clients/${client.id}${hasUnreviewedDiscovery ? "?tab=discovery" : ""}`;

                return (
                  <tr
                    key={client.id}
                    className="group cursor-pointer transition-colors hover:bg-slate-50/70"
                  >
                    <td className="px-4 py-3">
                      <div className="relative">
                        {/* Invisible overlay makes the whole row clickable */}
                        <Link
                          href={clientHref}
                          className="absolute inset-0 z-0"
                          aria-hidden="true"
                          tabIndex={-1}
                        />
                        <p className="relative z-10 font-semibold text-slate-900">
                          {client.companyName}
                        </p>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-slate-600">{client.contactName}</td>
                    <td className="px-4 py-3">
                      {pipelineStage ? (
                        <Badge
                          variant={getDiscoveryPipelineStageBadgeVariant(pipelineStage)}
                          className="text-[10px]"
                        >
                          {getDiscoveryPipelineStageLabel(pipelineStage)}
                        </Badge>
                      ) : (
                        <span className="text-xs text-slate-400">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <Badge
                        variant="outline"
                        className={cn(
                          "text-[10px] font-medium",
                          client.status === ClientStatus.ACTIVE
                            ? "border-emerald-200 bg-emerald-50 text-emerald-800"
                            : "border-slate-200 bg-slate-50 text-slate-600",
                        )}
                      >
                        {client.status === ClientStatus.ACTIVE ? "Active" : "Prospect"}
                      </Badge>
                    </td>
                    <td className="px-4 py-3">
                      <Badge variant="secondary" className="text-[10px]">
                        {client.planType}
                      </Badge>
                    </td>
                    <td className="px-4 py-3">
                      <BillingStatusBadge
                        engagementType={client.engagementType}
                        billingMode={client.billingMode}
                        billingOverrideReason={client.billingOverrideReason}
                        billingOverrideExpiresAt={client.billingOverrideExpiresAt}
                        billingOverrideCreatedAt={client.billingOverrideCreatedAt}
                        billingOverrideCreatedById={client.billingOverrideCreatedById}
                        stripeCustomerId={client.stripeCustomerId}
                        stripeSubscriptionId={client.stripeSubscriptionId}
                        subscriptionStatus={client.subscriptionStatus}
                        subscriptionCurrentPeriodEnd={client.subscriptionCurrentPeriodEnd}
                      />
                    </td>
                    <td className="px-4 py-3 text-xs text-slate-500">
                      {format(new Date(client.createdAt), "MMM d, yyyy")}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <Link
                        href={clientHref}
                        className={cn(
                          buttonVariants({ size: "sm", variant: "outline" }),
                          "relative z-10 border-slate-200 text-slate-700 hover:border-emerald-300 hover:text-emerald-700",
                        )}
                      >
                        Open
                      </Link>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function FilterTab({
  href,
  active,
  children,
}: {
  href: string;
  active: boolean;
  children: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      className={cn(
        "rounded-lg border px-3 py-1.5 text-sm font-medium transition-colors",
        active
          ? "border-slate-900 bg-slate-900 text-white"
          : "border-slate-200 text-slate-600 hover:bg-slate-50 hover:text-slate-900",
      )}
    >
      {children}
    </Link>
  );
}
