import { prisma } from "@/lib/prisma";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { 
  Users, 
  AlertCircle, 
  Clock, 
  CheckCircle2,
  TrendingUp
} from "lucide-react";
import {
  RequestStatus,
  ClientStatus,
  BillableType,
  OverflowStatus,
} from "@/generated/prisma/client";
import { format, startOfWeek } from "date-fns";
import { calculateWeeklyUsage } from "@/lib/usage";
import { cn } from "@/lib/utils";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";

export const dynamic = "force-dynamic";

export default async function AdminDashboard() {
  const [
    newRequestsCount,
    activeClientsCount,
    inProgressCount,
    needsInfoCount,
    includedTimeThisWeek,
    overflowTimeThisWeek,
  ] = await Promise.all([
    prisma.supportRequest.count({ where: { status: RequestStatus.NEW } }),
    prisma.client.count({ where: { status: ClientStatus.ACTIVE } }),
    prisma.supportRequest.count({ where: { status: RequestStatus.IN_PROGRESS } }),
    prisma.supportRequest.count({ where: { needsInfo: true } }),
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
    { title: "New Support Requests", value: newRequestsCount.toString(), icon: AlertCircle, color: "text-orange-600", bg: "bg-orange-50" },
    { title: "Active Clients", value: activeClientsCount.toString(), icon: Users, color: "text-blue-600", bg: "bg-blue-50" },
    { title: "In Progress", value: inProgressCount.toString(), icon: Clock, color: "text-indigo-600", bg: "bg-indigo-50" },
    { title: "Needs Info", value: needsInfoCount.toString(), icon: AlertCircle, color: "text-red-600", bg: "bg-red-50" },
    { title: "Included Hours (Week)", value: includedHours.toFixed(1), icon: TrendingUp, color: "text-green-600", bg: "bg-green-50" },
    { title: "Overflow Hours (Week)", value: overflowHours.toFixed(1), icon: CheckCircle2, color: "text-purple-600", bg: "bg-purple-50" },
  ];

  const recentRequests = await prisma.supportRequest.findMany({
    include: { client: true },
    orderBy: { createdAt: "desc" },
    take: 5
  });

  const overflowRequests = await prisma.supportRequest.findMany({
    where: {
      overflowStatus: {
        in: [OverflowStatus.NEEDS_APPROVAL, OverflowStatus.DEFERRED]
      }
    },
    include: { client: true },
    orderBy: { createdAt: "desc" },
    take: 5
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
        <h1 className="text-2xl font-bold tracking-tight">Dashboard Overview</h1>
        <p className="text-muted-foreground">Welcome back, Admin. Here&apos;s what&apos;s happening today.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {stats.map((stat, i) => (
          <Card key={i}>
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
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <Card>
          <CardHeader>
            <CardTitle>Overflow Decisions Needed</CardTitle>
          </CardHeader>
          <CardContent>
            {overflowRequests.length === 0 ? (
              <p className="text-sm text-muted-foreground py-4 text-center">No overflow decisions pending.</p>
            ) : (
              <div className="space-y-4">
                {overflowRequests.map((request, i) => (
                  <div key={i} className="flex items-center justify-between p-3 border rounded-lg bg-orange-50/30 border-orange-100">
                    <div>
                      <p className="font-medium text-sm truncate max-w-[200px]">{request.title}</p>
                      <p className="text-xs text-muted-foreground">{request.client.companyName} • {request.overflowStatus.replace("_", " ")}</p>
                    </div>
                    <Link 
                      href={`/admin/requests/${request.id}`}
                      className="text-xs font-semibold text-primary hover:underline"
                    >
                      Review
                    </Link>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Recent Requests</CardTitle>
          </CardHeader>
          <CardContent>
            {recentRequests.length === 0 ? (
              <p className="text-sm text-muted-foreground py-4 text-center">No requests yet.</p>
            ) : (
              <div className="space-y-4">
                {recentRequests.map((request, i) => (
                  <div key={i} className="flex items-center justify-between p-3 border rounded-lg">
                    <div>
                      <p className="font-medium text-sm truncate max-w-[200px]">{request.title || request.supportNeeded}</p>
                      <p className="text-xs text-muted-foreground">{request.client.companyName} • {format(new Date(request.createdAt), "MMM d")}</p>
                    </div>
                    <div className="text-xs font-semibold px-2 py-1 rounded bg-slate-100">
                      {request.status.replace("_", " ")}
                    </div>
                  </div>
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
                {capacityWatch.map((client, i) => (
                  <div key={i} className="space-y-2">
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
