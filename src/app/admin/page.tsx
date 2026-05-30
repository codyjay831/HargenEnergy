import { prisma } from "@/lib/prisma";
import {
  RequestStatus,
  ClientStatus,
  BillableType,
  SupportRequestKind,
  DiscoveryAppointmentStatus,
} from "@/generated/prisma/client";
import {
  startOfWeek,
  startOfDay,
  endOfDay,
  formatDistanceToNow,
} from "date-fns";
import { formatInTimeZone } from "date-fns-tz";
import { calculateWeeklyUsage } from "@/lib/usage";
import { adminClientTabHref } from "@/lib/admin-client-tabs";
import { cn } from "@/lib/utils";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { buttonVariants } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { PriorityButtons } from "@/components/admin/PriorityButtons";
import {
  deriveDiscoveryPipelineStage,
  getDiscoveryPipelineStageLabel,
  pickDiscoveryAppointmentForPipeline,
  type DiscoveryPipelineStage,
} from "@/lib/discovery-scheduling/pipeline";
import {
  adminBrandGlow,
  adminBrandGlowHover,
  adminBtnPrimary,
  adminPanelBorder,
  adminViewAllLink,
  adminSecondaryLink,
} from "@/lib/admin-ui/tokens";
import {
  clientHealthBadgeClass,
  rankToPriorityLabel,
  priorityRankBadgeClass,
  requestStatusBadgeClass,
  formatAge,
  type ClientHealth,
} from "@/lib/admin-ui/status-badges";
import {
  ArrowUpRight,
  CalendarDays,
  CheckCircle2,
  Clock3,
  Flame,
  Inbox,
  Plus,
  TriangleAlert,
  Users,
  Wrench,
  PlayCircle,
} from "lucide-react";

export const dynamic = "force-dynamic";

const NEEDS_SCHEDULING_STAGES: DiscoveryPipelineStage[] = [
  "qualified",
  "link_sent",
  "booking_canceled",
  "awaiting_info",
];

function schedulingStageSubtitle(
  stage: DiscoveryPipelineStage,
): string {
  switch (stage) {
    case "booking_canceled":
      return "Booking canceled — regenerate link";
    case "link_sent":
      return "Link sent, waiting to book";
    case "qualified":
      return "Ready to send scheduling link";
    case "awaiting_info":
      return "Awaiting prospect response";
    default:
      return "";
  }
}

function deriveClientHealth({
  weeklyHours,
  hasNeedsInfo,
  isNearLimit,
  isOverLimit,
}: {
  weeklyHours: number;
  hasNeedsInfo: boolean;
  isNearLimit: boolean;
  isOverLimit: boolean;
}): ClientHealth {
  if (weeklyHours > 0 && isOverLimit) return "Over limit";
  if (weeklyHours > 0 && isNearLimit) return "Near limit";
  if (hasNeedsInfo) return "Needs info";
  return "Healthy";
}

function deriveNextStep(health: ClientHealth, topTitle: string | null): string {
  if (health === "Over limit") return "Approve overflow billing";
  if (health === "Near limit") return "Approaching weekly limit";
  if (health === "Needs info" && topTitle) return topTitle;
  if (health === "Needs info") return "Awaiting client response";
  return topTitle ?? "No open work";
}

export default async function AdminDashboard() {
  const weekStart = startOfWeek(new Date(), { weekStartsOn: 1 });
  const todayStart = startOfDay(new Date());
  const todayEnd = endOfDay(new Date());

  const [
    openWorkCount,
    needsInfoCount,
    includedTime,
    overflowTime,
    activeClientsRaw,
    workQueueRaw,
    upcomingDiscoveries,
    schedulingCandidates,
    activeTimer,
    inProgressCount,
  ] = await Promise.all([
    // Open work (New + In Progress + Reviewed + needs attention)
    prisma.supportRequest.count({
      where: {
        kind: SupportRequestKind.CLIENT_OPS,
        status: {
          notIn: [RequestStatus.COMPLETE, RequestStatus.CANCELLED],
        },
      },
    }),

    // Needs info
    prisma.supportRequest.count({
      where: { kind: SupportRequestKind.CLIENT_OPS, needsInfo: true },
    }),

    // Hours this week — included
    prisma.timeEntry.aggregate({
      where: {
        billableType: BillableType.INCLUDED,
        date: { gte: weekStart },
      },
      _sum: { minutes: true },
    }),

    // Hours this week — overflow
    prisma.timeEntry.aggregate({
      where: {
        billableType: BillableType.OVERFLOW,
        date: { gte: weekStart },
      },
      _sum: { minutes: true },
    }),

    // Active clients with usage + top open request
    prisma.client.findMany({
      where: { status: ClientStatus.ACTIVE },
      include: {
        timeEntries: {
          where: { date: { gte: weekStart } },
        },
        requests: {
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
          select: {
            id: true,
            title: true,
            needsInfo: true,
            priorityRank: true,
          },
        },
      },
      orderBy: { updatedAt: "desc" },
      take: 8,
    }),

    // Work queue: prioritized first, then open
    prisma.supportRequest.findMany({
      where: {
        kind: SupportRequestKind.CLIENT_OPS,
        status: {
          notIn: [RequestStatus.COMPLETE, RequestStatus.CANCELLED],
        },
      },
      orderBy: [{ priorityRank: "asc" }, { createdAt: "desc" }],
      take: 8,
      include: {
        client: { select: { id: true, companyName: true } },
      },
    }),

    // Upcoming discovery calls
    prisma.discoveryAppointment.findMany({
      where: {
        status: {
          in: [
            DiscoveryAppointmentStatus.SCHEDULED,
            DiscoveryAppointmentStatus.RESCHEDULED,
          ],
        },
        scheduledStartUtc: { gte: new Date() },
        client: { status: ClientStatus.LEAD },
      },
      include: {
        client: { select: { id: true, companyName: true } },
      },
      orderBy: { scheduledStartUtc: "asc" },
      take: 4,
    }),

    // Scheduling candidates (leads needing attention)
    prisma.supportRequest.findMany({
      where: {
        kind: SupportRequestKind.PROSPECT_INTAKE,
        client: { status: ClientStatus.LEAD },
        status: { notIn: [RequestStatus.COMPLETE, RequestStatus.CANCELLED] },
      },
      include: {
        client: {
          select: { id: true, companyName: true, status: true },
        },
        discoverySchedulingLink: { select: { status: true } },
        discoveryAppointments: {
          orderBy: { createdAt: "desc" },
          take: 10,
          select: {
            status: true,
            fitDecision: true,
            recapSentAt: true,
            createdAt: true,
            canceledAt: true,
          },
        },
      },
      orderBy: { updatedAt: "desc" },
      take: 10,
    }),

    // Running timer
    prisma.supportRequest.findFirst({
      where: { timerStartedAt: { not: null } },
      select: {
        id: true,
        title: true,
        timerStartedAt: true,
        client: { select: { companyName: true } },
      },
    }),

    // In-progress count (for today feed)
    prisma.supportRequest.count({
      where: {
        kind: SupportRequestKind.CLIENT_OPS,
        status: RequestStatus.IN_PROGRESS,
      },
    }),
  ]);

  // ── Derived: client health + next step ──────────────────────────────────
  const clientsWithHealth = activeClientsRaw.map((client) => {
    const usage = calculateWeeklyUsage(client.timeEntries, client.weeklyHours);
    const topRequest = client.requests[0] ?? null;
    const hasNeedsInfo = topRequest?.needsInfo ?? false;
    const health = deriveClientHealth({
      weeklyHours: client.weeklyHours,
      hasNeedsInfo,
      isNearLimit: usage.isNearLimit,
      isOverLimit: usage.isOverLimit,
    });
    const nextStep = deriveNextStep(health, topRequest?.title ?? null);
    const usageLabel =
      client.weeklyHours > 0
        ? `${(usage.includedMinutesThisWeek / 60).toFixed(1)} / ${client.weeklyHours}h`
        : "Unlimited";

    return { ...client, usage, health, nextStep, usageLabel };
  });

  const activeClientCount = clientsWithHealth.length;
  const nearLimitCount = clientsWithHealth.filter(
    (c) => c.health === "Near limit" || c.health === "Over limit",
  ).length;

  // ── Derived: KPIs ───────────────────────────────────────────────────────
  const includedHours = (includedTime._sum.minutes ?? 0) / 60;
  const overflowHours = (overflowTime._sum.minutes ?? 0) / 60;

  // ── Derived: work queue with enriched labels ────────────────────────────
  const queueItems = workQueueRaw.map((req) => ({
    ...req,
    priorityLabel: rankToPriorityLabel(req.priorityRank),
    priorityClass: priorityRankBadgeClass(req.priorityRank),
    statusClass: requestStatusBadgeClass(req.status),
    age: formatAge(req.createdAt),
    statusLabel: req.status.replace(/_/g, " "),
  }));

  // ── Derived: leads lane ─────────────────────────────────────────────────
  const needsSchedulingItems = schedulingCandidates
    .map((request) => {
      const appt = pickDiscoveryAppointmentForPipeline(
        request.discoveryAppointments,
      );
      const pipelineStage = deriveDiscoveryPipelineStage({
        clientStatus: request.client.status,
        requestStatus: request.status,
        linkStatus: request.discoverySchedulingLink?.status ?? null,
        appointmentStatus: appt?.status ?? null,
        fitDecision: appt?.fitDecision ?? null,
        recapSentAt: appt?.recapSentAt ?? null,
      });
      return { request, pipelineStage };
    })
    .filter(({ pipelineStage }) =>
      NEEDS_SCHEDULING_STAGES.includes(pipelineStage),
    )
    .slice(0, Math.max(0, 4 - upcomingDiscoveries.length));

  const leadsLaneItems = [
    ...upcomingDiscoveries.map((appt) => ({
      id: `appt-${appt.id}`,
      company: appt.client.companyName,
      subtitle: formatInTimeZone(
        appt.scheduledStartUtc,
        appt.timezone,
        "EEE, MMM d 'at' h:mm a",
      ),
      badge: "Scheduled",
      badgeClass: "border-blue-200 bg-blue-50 text-blue-800",
      href: `/admin/clients/${appt.clientId}?tab=discovery`,
    })),
    ...needsSchedulingItems.map(({ request, pipelineStage }) => ({
      id: `req-${request.id}`,
      company: request.client.companyName,
      subtitle: schedulingStageSubtitle(pipelineStage),
      badge: getDiscoveryPipelineStageLabel(pipelineStage),
      badgeClass: "border-amber-200 bg-amber-50 text-amber-900",
      href: `/admin/clients/${request.clientId}?tab=discovery`,
    })),
  ];

  // ── Derived: today feed ─────────────────────────────────────────────────
  const todayDiscoveryCount = upcomingDiscoveries.filter(
    (a) =>
      a.scheduledStartUtc >= todayStart && a.scheduledStartUtc <= todayEnd,
  ).length;

  return (
    <div className="space-y-5">
      {/* ── Hero ────────────────────────────────────────────────────────── */}
      <div
        className={cn(
          "rounded-xl border border-slate-200 bg-white p-4 sm:p-5",
          adminBrandGlow,
        )}
      >
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
              Solar Ops Desk
            </p>
            <h1 className="text-2xl font-semibold tracking-tight text-slate-900">
              Dashboard
            </h1>
            <p className="mt-0.5 text-sm text-slate-600">
              Active clients first. Work in, work out.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Link
              href="/admin/clients?status=ACTIVE"
              className={cn(
                buttonVariants({ variant: "outline", size: "sm" }),
                "border-slate-200 text-slate-700 hover:bg-slate-50",
              )}
            >
              <Users className="h-3.5 w-3.5" />
              Active Clients
            </Link>
            <Link
              href="/admin/requests"
              className={cn(buttonVariants({ size: "sm" }), adminBtnPrimary)}
            >
              <Wrench className="h-3.5 w-3.5" />
              Open Work Queue
            </Link>
          </div>
        </div>
      </div>

      {/* ── KPI strip ───────────────────────────────────────────────────── */}
      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard
          label="Active Clients"
          value={activeClientCount}
          note={
            nearLimitCount > 0
              ? `${nearLimitCount} near limit`
              : "All healthy"
          }
          noteClass={nearLimitCount > 0 ? "text-orange-600" : "text-emerald-700"}
          icon={Users}
          href="/admin/clients?status=ACTIVE"
        />
        <KpiCard
          label="Open Work"
          value={openWorkCount}
          note={`${inProgressCount} in progress`}
          icon={Wrench}
          href="/admin/requests"
        />
        <KpiCard
          label="Needs Info"
          value={needsInfoCount}
          note={needsInfoCount > 0 ? "Follow up today" : "All clear"}
          noteClass={needsInfoCount > 0 ? "text-amber-600" : "text-slate-400"}
          icon={TriangleAlert}
          href="/admin/requests"
          urgent={needsInfoCount > 0}
        />
        <KpiCard
          label="Hours This Week"
          value={`${includedHours.toFixed(1)}h`}
          note={
            overflowHours > 0
              ? `+${overflowHours.toFixed(1)}h overflow`
              : "No overflow"
          }
          noteClass={overflowHours > 0 ? "text-orange-600" : "text-slate-400"}
          icon={Clock3}
          href="/admin/time"
        />
      </section>

      {/* ── Two-col grid: main + right rail ─────────────────────────────── */}
      <section className="grid gap-5 xl:grid-cols-[1.65fr_1fr]">
        {/* Left: main column */}
        <div className="space-y-5">
          {/* Active clients panel */}
          <Card className={cn(adminPanelBorder)}>
            <CardHeader className="flex flex-row items-center justify-between pb-3">
              <CardTitle className="text-base font-semibold text-slate-900">
                Active clients
              </CardTitle>
              <Link href="/admin/clients?status=ACTIVE" className={adminViewAllLink}>
                View all
              </Link>
            </CardHeader>
            <CardContent className="space-y-2">
              {clientsWithHealth.length === 0 ? (
                <EmptyState
                  icon={Users}
                  title="No active clients yet"
                  description="Activate a prospect after discovery to start tracking delivery."
                  action={{ label: "View Prospects", href: "/admin/clients" }}
                />
              ) : (
                clientsWithHealth.map((client, index) => (
                  <Link
                    key={client.id}
                    href={adminClientTabHref(client.id, "overview")}
                    className={cn(
                      "grid gap-2 rounded-lg border border-slate-200 bg-white p-3 transition-all",
                      "md:grid-cols-[1.5fr_1fr_1fr_auto_auto] md:items-center",
                      adminBrandGlowHover,
                      index === 0 && adminBrandGlow,
                    )}
                  >
                    <div className="min-w-0">
                      <p className="truncate font-medium text-slate-900">
                        {client.companyName}
                      </p>
                      <p className="truncate text-xs text-slate-500">
                        {client.contactName}
                      </p>
                    </div>
                    <div className="min-w-0 text-xs text-slate-600">
                      <p className="font-medium text-slate-700">Next</p>
                      <p className="truncate">{client.nextStep}</p>
                    </div>
                    <p className="text-xs font-medium text-slate-600">
                      {client.usageLabel}
                    </p>
                    <Badge
                      variant="outline"
                      className={cn(
                        "w-fit text-[10px] font-medium",
                        clientHealthBadgeClass(client.health),
                      )}
                    >
                      {client.health}
                    </Badge>
                    <ArrowUpRight className="h-4 w-4 shrink-0 text-slate-400" />
                  </Link>
                ))
              )}
            </CardContent>
          </Card>

          {/* Work queue */}
          <Card className={adminPanelBorder}>
            <CardHeader className="flex flex-row items-center justify-between pb-3">
              <div className="flex items-center gap-2">
                <CardTitle className="text-base font-semibold text-slate-900">
                  Work queue
                </CardTitle>
                <Badge
                  variant="outline"
                  className="border-emerald-200 bg-emerald-50 text-[10px] font-medium text-emerald-800"
                >
                  Do now
                </Badge>
              </div>
              <Link href="/admin/requests" className={adminSecondaryLink}>
                Full queue
              </Link>
            </CardHeader>
            <CardContent className="space-y-2">
              {queueItems.length === 0 ? (
                <EmptyState
                  icon={Wrench}
                  title="No open work right now"
                  description="New requests from clients will appear here."
                  action={{ label: "View Requests", href: "/admin/requests" }}
                />
              ) : (
                queueItems.map((item) => (
                  <div
                    key={item.id}
                    className="grid gap-2 rounded-lg border border-slate-200 bg-white p-3 md:grid-cols-[64px_1fr_52px_110px_80px] md:items-center"
                  >
                    <Badge
                      variant="outline"
                      className={cn(
                        "w-fit text-[10px] font-semibold",
                        item.priorityClass,
                      )}
                    >
                      {item.priorityLabel}
                    </Badge>
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium text-slate-900">
                        {item.title}
                      </p>
                      <p className="truncate text-xs text-slate-500">
                        {item.client.companyName}
                      </p>
                    </div>
                    <p className="text-xs text-slate-500">{item.age}</p>
                    <Badge
                      variant="outline"
                      className={cn(
                        "w-fit text-[10px] font-medium",
                        item.statusClass,
                      )}
                    >
                      {item.statusLabel}
                    </Badge>
                    <div className="flex items-center gap-1.5">
                      <Link
                        href={`/admin/requests/${item.id}`}
                        className={cn(
                          buttonVariants({ size: "sm" }),
                          adminBtnPrimary,
                          "h-7 text-xs",
                        )}
                      >
                        Open
                      </Link>
                      <PriorityButtons
                        requestId={item.id}
                        currentPriority={item.priorityRank}
                      />
                    </div>
                  </div>
                ))
              )}
            </CardContent>
          </Card>

          {/* Leads lane */}
          {leadsLaneItems.length > 0 && (
            <Card className={cn(adminPanelBorder, "border-slate-100")}>
              <CardHeader className="flex flex-row items-center justify-between pb-3">
                <CardTitle className="text-sm font-medium text-slate-600">
                  Discovery pipeline
                </CardTitle>
                <Link
                  href="/admin/clients?status=LEAD"
                  className={adminSecondaryLink}
                >
                  View leads
                </Link>
              </CardHeader>
              <CardContent className="space-y-2">
                {leadsLaneItems.map((lead) => (
                  <Link
                    key={lead.id}
                    href={lead.href}
                    className="flex items-center justify-between rounded-lg border border-slate-100 bg-slate-50/60 p-3 transition-colors hover:bg-slate-100/60"
                  >
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium text-slate-900">
                        {lead.company}
                      </p>
                      <p className="truncate text-xs text-slate-500">
                        {lead.subtitle}
                      </p>
                    </div>
                    <Badge
                      variant="outline"
                      className={cn(
                        "ml-3 shrink-0 text-[10px] font-medium",
                        lead.badgeClass,
                      )}
                    >
                      {lead.badge}
                    </Badge>
                  </Link>
                ))}
              </CardContent>
            </Card>
          )}
        </div>

        {/* Right rail */}
        <div className="space-y-5">
          {/* Quick execution rail */}
          <Card className={cn(adminPanelBorder, adminBrandGlow)}>
            <CardHeader className="pb-3">
              <CardTitle className="text-base font-semibold text-slate-900">
                Quick execution
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {/* Timer block */}
              {activeTimer ? (
                <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
                  <div className="flex items-center gap-1.5 mb-1">
                    <PlayCircle className="h-3.5 w-3.5 text-emerald-600 animate-pulse" />
                    <p className="text-xs font-semibold uppercase tracking-wide text-emerald-700">
                      Timer running
                    </p>
                  </div>
                  <p className="text-sm font-semibold text-slate-900 truncate">
                    {activeTimer.client.companyName}
                  </p>
                  <p className="text-xs text-slate-600 truncate mt-0.5">
                    {activeTimer.title}
                  </p>
                  <p className="text-xs text-slate-500 mt-1">
                    Started{" "}
                    {formatDistanceToNow(activeTimer.timerStartedAt!, {
                      addSuffix: true,
                    })}
                  </p>
                  <Link
                    href={`/admin/requests/${activeTimer.id}`}
                    className={cn(
                      buttonVariants({ size: "sm" }),
                      adminBtnPrimary,
                      "mt-3 w-full justify-center text-xs",
                    )}
                  >
                    Continue working →
                  </Link>
                </div>
              ) : (
                <div className="rounded-lg border border-dashed border-slate-200 p-3 text-center">
                  <p className="text-xs text-slate-500">No active timer</p>
                  <Link
                    href="/admin/requests"
                    className="mt-0.5 block text-xs font-medium text-emerald-700 hover:underline"
                  >
                    Start from work queue →
                  </Link>
                </div>
              )}

              {/* Quick action links */}
              <div className="grid gap-1.5">
                {[
                  {
                    icon: Plus,
                    label: "Log work request",
                    href: "/admin/requests",
                  },
                  {
                    icon: Clock3,
                    label: "Quick time entry",
                    href: "/admin/time",
                  },
                  {
                    icon: Users,
                    label: "View active clients",
                    href: "/admin/clients?status=ACTIVE",
                  },
                ].map(({ icon: Icon, label, href }) => (
                  <Link
                    key={href}
                    href={href}
                    className="flex items-center justify-between rounded-lg border border-slate-200 p-2.5 transition-colors hover:bg-slate-50"
                  >
                    <span className="flex items-center gap-2 text-sm font-medium text-slate-800">
                      <Icon className="h-4 w-4 text-slate-400" />
                      {label}
                    </span>
                    <ArrowUpRight className="h-3.5 w-3.5 text-slate-400" />
                  </Link>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Today feed */}
          <Card className={adminPanelBorder}>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-slate-700">
                Today
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <TodayRow
                icon={TriangleAlert}
                tone={needsInfoCount > 0 ? "warning" : "ok"}
                href="/admin/requests"
              >
                {needsInfoCount > 0
                  ? `${needsInfoCount} request${needsInfoCount === 1 ? "" : "s"} need info`
                  : "No requests need info"}
              </TodayRow>

              <TodayRow
                icon={Wrench}
                tone={inProgressCount > 0 ? "active" : "ok"}
                href="/admin/requests"
              >
                {inProgressCount > 0
                  ? `${inProgressCount} in progress`
                  : "Nothing in progress"}
              </TodayRow>

              <TodayRow
                icon={CalendarDays}
                tone={todayDiscoveryCount > 0 ? "active" : "ok"}
                href="/admin/clients?status=LEAD"
              >
                {todayDiscoveryCount > 0
                  ? `${todayDiscoveryCount} discovery call${todayDiscoveryCount === 1 ? "" : "s"} today`
                  : "No discovery calls today"}
              </TodayRow>

              <TodayRow
                icon={nearLimitCount > 0 ? Flame : CheckCircle2}
                tone={nearLimitCount > 0 ? "warning" : "success"}
                href="/admin/clients?status=ACTIVE"
              >
                {nearLimitCount > 0
                  ? `${nearLimitCount} client${nearLimitCount === 1 ? "" : "s"} near capacity`
                  : "All clients within capacity"}
              </TodayRow>

              <TodayRow icon={Inbox} tone="ok" href="/admin/time">
                {`${includedHours.toFixed(1)}h logged this week`}
              </TodayRow>
            </CardContent>
          </Card>
        </div>
      </section>
    </div>
  );
}

// ── Sub-components ──────────────────────────────────────────────────────────

function KpiCard({
  label,
  value,
  note,
  noteClass,
  icon: Icon,
  href,
  urgent,
}: {
  label: string;
  value: string | number;
  note: string;
  noteClass?: string;
  icon: React.ComponentType<{ className?: string }>;
  href: string;
  urgent?: boolean;
}) {
  return (
    <Link href={href}>
      <Card
        className={cn(
          "border-slate-200 shadow-none transition-shadow hover:shadow-sm",
          urgent && "border-amber-200",
        )}
      >
        <CardContent className="flex items-center justify-between p-4">
          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
              {label}
            </p>
            <p className="mt-1 text-2xl font-semibold text-slate-900">
              {value}
            </p>
            <p className={cn("text-xs", noteClass ?? "text-slate-500")}>
              {note}
            </p>
          </div>
          <div
            className={cn(
              "rounded-lg p-2",
              urgent ? "bg-amber-50" : "bg-slate-100",
            )}
          >
            <Icon
              className={cn(
                "h-4 w-4",
                urgent ? "text-amber-600" : "text-slate-500",
              )}
            />
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}

function TodayRow({
  icon: Icon,
  tone,
  href,
  children,
}: {
  icon: React.ComponentType<{ className?: string }>;
  tone: "success" | "warning" | "active" | "ok";
  href: string;
  children: React.ReactNode;
}) {
  const iconClass =
    tone === "success"
      ? "text-emerald-600"
      : tone === "warning"
        ? "text-amber-600"
        : tone === "active"
          ? "text-blue-600"
          : "text-slate-400";

  return (
    <Link
      href={href}
      className="flex items-center gap-2 rounded-md px-1 py-1 text-sm text-slate-700 transition-colors hover:bg-slate-50"
    >
      <Icon className={cn("h-4 w-4 shrink-0", iconClass)} />
      {children}
    </Link>
  );
}
