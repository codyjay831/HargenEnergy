import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { calculateWeeklyUsage } from "@/lib/usage";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { 
  Clock, 
  ClipboardList, 
  AlertCircle, 
  TrendingUp,
  PlusCircle,
  UserCircle
} from "lucide-react";
import Link from "next/link";
import { format, startOfWeek } from "date-fns";
import { cn } from "@/lib/utils";
import { buttonVariants } from "@/components/ui/button";

export const dynamic = "force-dynamic";

export default async function PortalDashboard() {
  const session = await auth();
  const clientId = session?.user?.clientId;

  if (!clientId) {
    // This should be handled by layout, but for safety:
    return <div>Client not found.</div>;
  }

  const client = await prisma.client.findUnique({
    where: { id: clientId },
    include: {
      requests: {
        orderBy: { updatedAt: "desc" },
        take: 5
      },
      timeEntries: {
        where: {
          date: {
            gte: startOfWeek(new Date(), { weekStartsOn: 1 })
          }
        }
      }
    }
  });

  if (!client) {
    return <div>Client not found.</div>;
  }

  const usage = calculateWeeklyUsage(client.timeEntries, client.weeklyHours);
  
  const openRequestsCount = await prisma.supportRequest.count({
    where: { 
      clientId,
      status: { notIn: ["COMPLETE", "CANCELLED"] }
    }
  });

  const needsInfoCount = await prisma.supportRequest.count({
    where: { 
      clientId,
      OR: [
        { status: "NEEDS_INFO" },
        { needsInfo: true }
      ]
    }
  });

  const stats = [
    { title: "Open Requests", value: openRequestsCount.toString(), icon: ClipboardList, color: "text-blue-600", bg: "bg-blue-50" },
    { title: "Needs Info", value: needsInfoCount.toString(), icon: AlertCircle, color: "text-orange-600", bg: "bg-orange-50" },
    { title: "Included Hours (Week)", value: (usage.includedMinutesThisWeek / 60).toFixed(1), icon: Clock, color: "text-green-600", bg: "bg-green-50" },
  ];

  return (
    <div className="space-y-8">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Your Hargen Energy Solar Ops Desk</h1>
          <p className="text-muted-foreground">{client.companyName} • {client.planType} Support Block</p>
        </div>
        <Link 
          href="/portal/requests/new" 
          className={cn(buttonVariants({ variant: "default" }), "flex items-center gap-2")}
        >
          <PlusCircle className="h-4 w-4" />
          Submit work
        </Link>
      </div>

      {/* Capacity Card */}
      <Card className="border-primary/20 bg-primary/[0.02]">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <TrendingUp className="h-5 w-5 text-primary" />
            Weekly Support Capacity
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <p className="text-xs text-muted-foreground uppercase font-semibold">Reserved</p>
                  <p className="text-2xl font-bold">{client.weeklyHours} hrs</p>
                </div>
                <div className="space-y-1">
                  <p className="text-xs text-muted-foreground uppercase font-semibold">Used</p>
                  <p className={cn("text-2xl font-bold", usage.isOverLimit ? "text-red-600" : usage.isNearLimit ? "text-orange-600" : "text-slate-900")}>
                    {(usage.includedMinutesThisWeek / 60).toFixed(1)} hrs
                  </p>
                </div>
              </div>
              <div className="space-y-2">
                <div className="flex justify-between text-xs font-medium">
                  <span>Included Usage</span>
                  <span>{usage.percentUsed.toFixed(0)}%</span>
                </div>
                <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden">
                  <div 
                    className={cn("h-full transition-all", usage.isOverLimit ? "bg-red-500" : usage.isNearLimit ? "bg-orange-500" : "bg-primary")} 
                    style={{ width: `${Math.min(usage.percentUsed, 100)}%` }}
                  />
                </div>
              </div>
            </div>

            <div className="md:border-l md:pl-8 space-y-3">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Remaining:</span>
                <span className="font-bold">{(usage.remainingIncludedMinutes / 60).toFixed(1)} hrs</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Overflow logged:</span>
                <span className="font-medium text-orange-600">{(usage.overflowMinutesThisWeek / 60).toFixed(1)} hrs</span>
              </div>
              <p className="text-[10px] text-muted-foreground mt-2 italic">
                * Support blocks reset every Monday. Overflow time requires separate approval.
              </p>
            </div>

            <div className="md:border-l md:pl-8 flex flex-col justify-center">
              {usage.isOverLimit ? (
                <div className="p-3 bg-red-50 border border-red-100 rounded-md">
                  <p className="text-xs font-bold text-red-800">Capacity Alert</p>
                  <p className="text-[10px] text-red-700 mt-1">You have exceeded your weekly reserved hours. Additional work will be tracked as overflow or deferred.</p>
                </div>
              ) : usage.isNearLimit ? (
                <div className="p-3 bg-orange-50 border border-orange-100 rounded-md">
                  <p className="text-xs font-bold text-orange-800">Near Limit</p>
                  <p className="text-[10px] text-orange-700 mt-1">You are approaching your weekly limit. We will prioritize high-impact work first.</p>
                </div>
              ) : (
                <div className="p-3 bg-green-50 border border-green-100 rounded-md">
                  <p className="text-xs font-bold text-green-800">Healthy Capacity</p>
                  <p className="text-[10px] text-green-700 mt-1">Your weekly support block is active and ready for more requests.</p>
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {stats.map((stat) => (
          <Card key={stat.title}>
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
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Recent Activity</CardTitle>
            <Link href="/portal/requests" className="text-xs text-primary hover:underline font-medium">View All</Link>
          </CardHeader>
          <CardContent>
            {client.requests.length === 0 ? (
              <p className="text-sm text-muted-foreground py-4 text-center">No requests yet.</p>
            ) : (
              <div className="space-y-4">
                {client.requests.map((request) => (
                  <Link 
                    key={request.id} 
                    href={`/portal/requests/${request.id}`}
                    className="flex items-center justify-between p-3 border rounded-lg hover:bg-slate-50 transition-colors"
                  >
                    <div>
                      <p className="font-medium text-sm truncate max-w-[200px]">{request.title}</p>
                      <p className="text-xs text-muted-foreground">{format(new Date(request.updatedAt), "MMM d, yyyy")}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      {(request.status === "NEEDS_INFO" || request.needsInfo) && (
                        <Badge variant="destructive" className="text-[10px] px-1 py-0 h-4">Action Needed</Badge>
                      )}
                      <Badge variant="outline" className="text-[10px]">
                        {request.status.replace("_", " ")}
                      </Badge>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Quick Actions</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 gap-3">
              <Link 
                href="/portal/requests/new" 
                className="flex items-center justify-between p-4 border rounded-lg hover:bg-slate-50 transition-colors group"
              >
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-primary/10 rounded text-primary group-hover:bg-primary group-hover:text-white transition-colors">
                    <PlusCircle className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="text-sm font-bold">Submit New Request</p>
                    <p className="text-xs text-muted-foreground">Tell us where you&apos;re stuck.</p>
                  </div>
                </div>
                <ChevronRight className="h-4 w-4 text-muted-foreground" />
              </Link>
              
              <Link 
                href="/portal/account" 
                className="flex items-center justify-between p-4 border rounded-lg hover:bg-slate-50 transition-colors group"
              >
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-slate-100 rounded text-slate-600 group-hover:bg-slate-900 group-hover:text-white transition-colors">
                    <UserCircle className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="text-sm font-bold">Account Settings</p>
                    <p className="text-xs text-muted-foreground">View company and plan details.</p>
                  </div>
                </div>
                <ChevronRight className="h-4 w-4 text-muted-foreground" />
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function ChevronRight({ className }: { className?: string }) {
  return (
    <svg 
      xmlns="http://www.w3.org/2000/svg" 
      width="24" 
      height="24" 
      viewBox="0 0 24 24" 
      fill="none" 
      stroke="currentColor" 
      strokeWidth="2" 
      strokeLinecap="round" 
      strokeLinejoin="round" 
      className={className}
    >
      <path d="m9 18 6-6-6-6"/>
    </svg>
  );
}
