import { prisma } from "@/lib/prisma";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { 
  AlertCircle, 
  Clock, 
  TrendingUp,
  Inbox,
  UserCheck,
  FileText,
  Users,
  PlusCircle,
  Clock3,
  CreditCard,
  ChevronRight,
  ArrowUpCircle,
  ClipboardList
} from "lucide-react";
import { EmptyState } from "@/components/ui/empty-state";
import {
  RequestStatus,
  ClientStatus,
  BillableType,
  SupportRequestKind,
} from "@/generated/prisma/client";
import { format, startOfWeek } from "date-fns";
import { calculateWeeklyUsage } from "@/lib/usage";
import { cn } from "@/lib/utils";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { PRODUCT_LANGUAGE } from "@/lib/product-language";
import { PriorityButtons } from "@/components/admin/PriorityButtons";
import {
  deriveWalkthroughPipelineStage,
  getWalkthroughPipelineStageBadgeVariant,
  getWalkthroughPipelineStageLabel,
} from "@/lib/walkthrough-scheduling/pipeline";
import { StatusBadge } from "@/components/ui/status-badge";
import { formatUrgencyLabel } from "@/lib/ui-enums";

export const dynamic = "force-dynamic";

export default async function AdminDashboard() {
  // Funnel metrics
  const [
    newWalkthroughsCount,
    prospectsAwaitingActivationCount,
    newWorkRequestsCount,
    inProgressWorkCount,
    needsInfoCount,
    includedTimeThisWeek,
    overflowTimeThisWeek,
    prioritizedRequests,
  ] = await Promise.all([
    prisma.supportRequest.count({
      where: {
        kind: SupportRequestKind.PROSPECT_INTAKE,
        status: { in: [RequestStatus.NEW, RequestStatus.NEEDS_INFO] },
      },
    }),
    prisma.client.count({
      where: {
        status: ClientStatus.LEAD,
        requests: {
          some: {
            kind: SupportRequestKind.PROSPECT_INTAKE,
            status: { in: [RequestStatus.REVIEWED, RequestStatus.IN_PROGRESS] }
          }
        }
      }
    }),
    prisma.supportRequest.count({
      where: { kind: SupportRequestKind.CLIENT_OPS, status: RequestStatus.NEW },
    }),
    prisma.supportRequest.count({
      where: { kind: SupportRequestKind.CLIENT_OPS, status: RequestStatus.IN_PROGRESS },
    }),
    prisma.supportRequest.count({
      where: { kind: SupportRequestKind.CLIENT_OPS, needsInfo: true },
    }),
    prisma.timeEntry.aggregate({
      where: {
        billableType: BillableType.INCLUDED,
        date: { gte: startOfWeek(new Date(), { weekStartsOn: 1 }) }
      },
      _sum: { minutes: true }
    }),
    prisma.timeEntry.aggregate({
      where: {
        billableType: BillableType.OVERFLOW,
        date: { gte: startOfWeek(new Date(), { weekStartsOn: 1 }) }
      },
      _sum: { minutes: true }
    }),
    prisma.supportRequest.findMany({
      where: { 
        status: { notIn: [RequestStatus.COMPLETE, RequestStatus.CANCELLED] },
        priorityRank: { not: null }
      },
      orderBy: { priorityRank: "asc" },
      take: 5,
      include: { client: true }
    }),
  ]);

  const includedHours = (includedTimeThisWeek._sum.minutes || 0) / 60;
  const overflowHours = (overflowTimeThisWeek._sum.minutes || 0) / 60;

  const stats = [
    { 
      title: "Needs Review", 
      subtitle: "Walkthrough requests needing review or awaiting prospect response",
      value: newWalkthroughsCount.toString(), 
      icon: Inbox, 
      color: "text-amber-600", 
      bg: "bg-amber-50",
      link: "/admin/clients?needsReview=1&status=ALL"
    },
    { 
      title: "Walkthrough Pipeline", 
      subtitle: `${PRODUCT_LANGUAGE.prospect.plural} qualified and moving toward activation`,
      value: prospectsAwaitingActivationCount.toString(), 
      icon: UserCheck, 
      color: "text-blue-600", 
      bg: "bg-blue-50",
      link: "/admin/clients"
    },
    { 
      title: `New ${PRODUCT_LANGUAGE.workRequest.plural}`, 
      value: newWorkRequestsCount.toString(), 
      icon: AlertCircle, 
      color: "text-orange-600", 
      bg: "bg-orange-50",
      link: "/admin/requests"
    },
    { 
      title: "In Progress", 
      value: inProgressWorkCount.toString(), 
      icon: Clock, 
      color: "text-indigo-600", 
      bg: "bg-indigo-50",
      link: "/admin/requests"
    },
    { 
      title: "Needs Info", 
      value: needsInfoCount.toString(), 
      icon: AlertCircle, 
      color: "text-red-600", 
      bg: "bg-red-50",
      link: "/admin/requests"
    },
    { 
      title: `Capacity: ${includedHours.toFixed(1)}h + ${overflowHours.toFixed(1)}h overflow`, 
      value: `${(includedHours + overflowHours).toFixed(1)}h`, 
      icon: TrendingUp, 
      color: "text-green-600", 
      bg: "bg-green-50",
      link: "/admin/time"
    },
  ];

  const recentWalkthroughs = await prisma.supportRequest.findMany({
    where: { kind: SupportRequestKind.PROSPECT_INTAKE },
    include: {
      client: true,
      walkthroughSchedulingLink: { select: { status: true } },
      walkthroughAppointments: {
        orderBy: { createdAt: "desc" },
        take: 1,
        select: {
          status: true,
          fitDecision: true,
          recapSentAt: true,
        },
      },
    },
    orderBy: { createdAt: "desc" },
    take: 5,
  });

  const recentWorkRequests = await prisma.supportRequest.findMany({
    where: { kind: SupportRequestKind.CLIENT_OPS },
    include: { client: true },
    orderBy: { createdAt: "desc" },
    take: 5,
  });

  const capacityClients = await prisma.client.findMany({
    where: { status: ClientStatus.ACTIVE },
    include: {
      timeEntries: {
        where: {
          date: {
            gte: startOfWeek(new Date(), { weekStartsOn: 1 })
          }
        }
      }
    },
    take: 10
  });

  const capacityWatch = capacityClients.map(client => ({
    ...client,
    usage: calculateWeeklyUsage(client.timeEntries, client.weeklyHours)
  })).sort((a, b) => b.usage.percentUsed - a.usage.percentUsed);

  return (
    <div className="space-y-8">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Dashboard</h1>
          <p className="text-muted-foreground">Walkthrough pipeline and delivery at a glance.</p>
        </div>
        <div className="flex items-center gap-3">
          <Link 
            href="/admin/clients" 
            className={cn(buttonVariants({ variant: "outline", size: "sm" }), "flex items-center gap-2")}
          >
            <Users className="h-4 w-4" />
            Manage Clients
          </Link>
          <Link 
            href="/admin/requests" 
            className={cn(buttonVariants({ variant: "default", size: "sm" }), "flex items-center gap-2")}
          >
            <ClipboardList className="h-4 w-4" />
            All Requests
          </Link>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {stats.map((stat) => (
          <Link key={stat.title} href={stat.link}>
            <Card className="hover:shadow-md transition-shadow cursor-pointer">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  {stat.title}
                </CardTitle>
                <div className={`${stat.bg} p-2 rounded-md`}>
                  <stat.icon className={`h-4 w-4 ${stat.color}`} />
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stat.value}</div>
                {"subtitle" in stat && stat.subtitle && (
                  <p className="text-xs text-muted-foreground mt-1">{stat.subtitle}</p>
                )}
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Quick Actions Panel */}
        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle className="text-lg font-bold">Quick Actions</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <Link 
              href="/admin/clients" 
              className="flex items-center justify-between p-3 border rounded-lg hover:bg-slate-50 transition-colors group"
            >
              <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-50 rounded text-blue-600 group-hover:bg-blue-600 group-hover:text-white transition-colors">
                  <PlusCircle className="h-4 w-4" />
                </div>
                <span className="text-sm font-semibold">Invite New Client</span>
              </div>
              <ChevronRight className="h-4 w-4 text-slate-400" />
            </Link>
            <Link 
              href="/admin/time" 
              className="flex items-center justify-between p-3 border rounded-lg hover:bg-slate-50 transition-colors group"
            >
              <div className="flex items-center gap-3">
                <div className="p-2 bg-indigo-50 rounded text-indigo-600 group-hover:bg-indigo-600 group-hover:text-white transition-colors">
                  <Clock3 className="h-4 w-4" />
                </div>
                <span className="text-sm font-semibold">Log Time</span>
              </div>
              <ChevronRight className="h-4 w-4 text-slate-400" />
            </Link>
            <Link 
              href="/admin/billing" 
              className="flex items-center justify-between p-3 border rounded-lg hover:bg-slate-50 transition-colors group"
            >
              <div className="flex items-center gap-3">
                <div className="p-2 bg-emerald-50 rounded text-emerald-600 group-hover:bg-emerald-600 group-hover:text-white transition-colors">
                  <CreditCard className="h-4 w-4" />
                </div>
                <span className="text-sm font-semibold">New Disbursement</span>
              </div>
              <ChevronRight className="h-4 w-4 text-slate-400" />
            </Link>
          </CardContent>
        </Card>

        {/* Priority Management Panel */}
        <Card className="lg:col-span-2">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-lg font-bold flex items-center gap-2">
              <ArrowUpCircle className="h-5 w-5 text-primary" />
              Priority Management
            </CardTitle>
            <Link href="/admin/requests" className="text-xs text-primary hover:underline font-medium">View All</Link>
          </CardHeader>
          <CardContent>
            {prioritizedRequests.length === 0 ? (
              <div className="py-8 text-center border-2 border-dashed rounded-lg">
                <p className="text-sm text-muted-foreground">No requests have a priority rank assigned.</p>
                <Link 
                  href="/admin/requests" 
                  className={cn(buttonVariants({ variant: "link", size: "sm" }), "mt-2")}
                >
                  Assign Priority
                </Link>
              </div>
            ) : (
              <div className="space-y-3">
                {prioritizedRequests.map((request) => (
                  <div 
                    key={request.id}
                    className="flex items-center justify-between p-3 border rounded-lg bg-white shadow-sm"
                  >
                    <div className="flex items-center gap-4 min-w-0">
                      <div className="flex items-center justify-center w-6 h-6 rounded-full bg-slate-100 text-[10px] font-bold text-slate-600 shrink-0">
                        #{request.priorityRank}
                      </div>
                      <div className="min-w-0">
                        <Link href={`/admin/requests/${request.id}`} className="text-sm font-bold truncate hover:underline block">
                          {request.title}
                        </Link>
                        <p className="text-[10px] text-muted-foreground truncate">
                          {request.client.companyName}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3 shrink-0">
                      <StatusBadge status={request.status} className="hidden sm:inline-flex" />
                      <PriorityButtons requestId={request.id} currentPriority={request.priorityRank} />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Recent {PRODUCT_LANGUAGE.walkthrough.plural}</CardTitle>
            <Link href="/admin/clients?status=LEAD" className="text-xs text-primary hover:underline font-medium">
              View All
            </Link>
          </CardHeader>
          <CardContent>
            {recentWalkthroughs.length === 0 ? (
              <EmptyState
                icon={FileText}
                title={`No ${PRODUCT_LANGUAGE.walkthrough.plural.toLowerCase()} yet`}
                description="New prospect intake requests will appear here. Share your public request form to get started."
                action={{
                  label: "View Request Form",
                  href: "/request-help",
                }}
              />
            ) : (
              <div className="space-y-4">
                {recentWalkthroughs.map((request) => {
                  const appointment = request.walkthroughAppointments[0] ?? null;
                  const pipelineStage = deriveWalkthroughPipelineStage({
                    clientStatus: request.client.status,
                    requestStatus: request.status,
                    linkStatus: request.walkthroughSchedulingLink?.status ?? null,
                    appointmentStatus: appointment?.status ?? null,
                    fitDecision: appointment?.fitDecision ?? null,
                    recapSentAt: appointment?.recapSentAt ?? null,
                  });
                  return (
                  <Link
                    key={request.id}
                    href={`/admin/clients/${request.clientId}?tab=walkthrough&open=walkthrough`}
                    className="flex items-center justify-between p-3 border rounded-lg hover:bg-slate-50 transition-colors"
                  >
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm truncate">{request.client.companyName}</p>
                      <p className="text-xs text-muted-foreground truncate line-clamp-2">
                        {request.description}
                      </p>
                      <div className="flex flex-wrap items-center gap-2 mt-1">
                        <Badge variant="outline" className="text-[10px] px-1.5 py-0">
                          {formatUrgencyLabel(request.urgency)}
                        </Badge>
                        <span className="text-xs text-muted-foreground">
                          {format(new Date(request.createdAt), "MMM d, h:mm a")}
                        </span>
                      </div>
                    </div>
                    <Badge
                      variant={getWalkthroughPipelineStageBadgeVariant(pipelineStage)}
                      className="ml-2 shrink-0 text-[10px] px-1.5 py-0"
                    >
                      {getWalkthroughPipelineStageLabel(pipelineStage)}
                    </Badge>
                  </Link>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Recent {PRODUCT_LANGUAGE.workRequest.plural}</CardTitle>
            <Link href="/admin/requests" className="text-xs text-primary hover:underline font-medium">
              View All
            </Link>
          </CardHeader>
          <CardContent>
            {recentWorkRequests.length === 0 ? (
              <EmptyState
                icon={Inbox}
                title={`No ${PRODUCT_LANGUAGE.workRequest.plural.toLowerCase()} yet`}
                description="Client work requests will appear here once you have active clients in the system."
                action={{
                  label: "View All Clients",
                  href: "/admin/clients",
                }}
              />
            ) : (
              <div className="space-y-4">
                {recentWorkRequests.map((request) => (
                  <Link
                    key={request.id}
                    href={`/admin/requests/${request.id}`}
                    className="flex items-center justify-between p-3 border rounded-lg hover:bg-slate-50 transition-colors"
                  >
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm truncate">{request.client.companyName}</p>
                      <p className="text-xs text-muted-foreground truncate">{request.title}</p>
                      <p className="text-xs text-muted-foreground mt-1">
                        {format(new Date(request.createdAt), "MMM d, h:mm a")}
                      </p>
                    </div>
                    <StatusBadge status={request.status} className="ml-2 shrink-0" />
                  </Link>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Capacity Watch</CardTitle>
          </CardHeader>
          <CardContent>
            {capacityWatch.length === 0 ? (
              <EmptyState
                icon={Users}
                title="No active clients yet"
                description="Activate clients to start tracking their weekly capacity usage and support hours."
                action={{
                  label: "Manage Clients",
                  href: "/admin/clients",
                }}
              />
            ) : (
              <div className="space-y-6">
                {capacityWatch.map((client) => (
                  <div key={client.id} className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <div className="flex flex-col">
                        <span className="font-medium">{client.companyName}</span>
                        <span className="text-xs text-muted-foreground">{client.planType} Support</span>
                      </div>
                      <div className="text-right">
                        <span className={cn("font-bold", client.usage.isOverLimit ? "text-red-600" : client.usage.isNearLimit ? "text-orange-600" : "text-slate-900")}>
                          {(client.usage.includedMinutesThisWeek / 60).toFixed(1)} / {client.weeklyHours} hrs
                        </span>
                        <p className="text-[10px] text-muted-foreground">
                          {(client.usage.remainingIncludedMinutes / 60).toFixed(1)} hrs remaining
                        </p>
                      </div>
                    </div>
                    <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden">
                      <div 
                        className={cn("h-full transition-all", client.usage.isOverLimit ? "bg-red-500" : client.usage.isNearLimit ? "bg-orange-500" : "bg-primary")} 
                        style={{ width: `${Math.min(client.usage.percentUsed, 100)}%` }}
                      />
                    </div>
                    <div className="flex justify-between items-center">
                      <Badge variant={client.usage.isOverLimit ? "destructive" : client.usage.isNearLimit ? "default" : "outline"} className="text-[10px] px-1 py-0 h-4">
                        {client.usage.isOverLimit ? "Over Limit" : client.usage.isNearLimit ? "Near Limit" : "OK"}
                      </Badge>
                      <Link href={`/admin/clients/${client.id}`} className="text-[10px] text-primary hover:underline">
                        Manage
                      </Link>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
