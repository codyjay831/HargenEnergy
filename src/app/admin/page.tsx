import { prisma } from "@/lib/prisma";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { 
  AlertCircle, 
  Clock, 
  TrendingUp,
  Inbox,
  UserCheck
} from "lucide-react";
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
import { PRODUCT_LANGUAGE } from "@/lib/product-language";

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
  ] = await Promise.all([
    prisma.supportRequest.count({
      where: { kind: SupportRequestKind.PROSPECT_INTAKE, status: RequestStatus.NEW },
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
  ]);

  const includedHours = (includedTimeThisWeek._sum.minutes || 0) / 60;
  const overflowHours = (overflowTimeThisWeek._sum.minutes || 0) / 60;

  const stats = [
    { 
      title: `New ${PRODUCT_LANGUAGE.walkthrough.plural}`, 
      value: newWalkthroughsCount.toString(), 
      icon: Inbox, 
      color: "text-amber-600", 
      bg: "bg-amber-50",
      link: "/admin/clients?status=LEAD&needsReview=1"
    },
    { 
      title: `${PRODUCT_LANGUAGE.prospect.plural} Awaiting Activation`, 
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
    include: { client: true },
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
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Dashboard</h1>
        <p className="text-muted-foreground">Sales funnel and delivery pipeline at a glance.</p>
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
              </CardContent>
            </Card>
          </Link>
        ))}
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
              <p className="text-sm text-muted-foreground py-4 text-center">No {PRODUCT_LANGUAGE.walkthrough.plural.toLowerCase()} yet.</p>
            ) : (
              <div className="space-y-4">
                {recentWalkthroughs.map((request) => (
                  <Link
                    key={request.id}
                    href={`/admin/clients/${request.clientId}?open=walkthrough`}
                    className="flex items-center justify-between p-3 border rounded-lg hover:bg-slate-50 transition-colors"
                  >
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm truncate">{request.client.companyName}</p>
                      <p className="text-xs text-muted-foreground truncate">{request.supportNeeded}</p>
                      <p className="text-xs text-muted-foreground mt-1">
                        {format(new Date(request.createdAt), "MMM d, h:mm a")}
                      </p>
                    </div>
                    <Badge variant="outline" className="ml-2 shrink-0">
                      {request.status.replace("_", " ")}
                    </Badge>
                  </Link>
                ))}
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
              <p className="text-sm text-muted-foreground py-4 text-center">No {PRODUCT_LANGUAGE.workRequest.plural.toLowerCase()} yet.</p>
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
                    <Badge variant="outline" className="ml-2 shrink-0">
                      {request.status.replace("_", " ")}
                    </Badge>
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
              <p className="text-sm text-muted-foreground py-4 text-center">No active clients yet.</p>
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
