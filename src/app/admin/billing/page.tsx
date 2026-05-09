import { prisma } from "@/lib/prisma";
import { format, startOfWeek } from "date-fns";
import { Badge } from "@/components/ui/badge";
import Link from "next/link";
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table";
import { ExternalLink, AlertTriangle } from "lucide-react";
import { calculateWeeklyUsage } from "@/lib/usage";
import { cn } from "@/lib/utils";
import { OverflowStatus } from "@/generated/prisma/client";

export const dynamic = "force-dynamic";

export default async function AdminBilling() {
  const clients = await prisma.client.findMany({
    include: {
      timeEntries: {
        where: {
          date: {
            gte: startOfWeek(new Date(), { weekStartsOn: 1 })
          }
        }
      },
      requests: {
        where: {
          overflowStatus: OverflowStatus.NEEDS_APPROVAL
        }
      }
    },
    orderBy: {
      companyName: "asc",
    },
  });

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">Billing & Subscriptions</h1>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white p-6 rounded-lg border shadow-sm">
          <p className="text-sm font-medium text-muted-foreground uppercase tracking-wider">Active Subscriptions</p>
          <p className="text-3xl font-bold mt-2">{clients.filter(c => c.subscriptionStatus === "active").length}</p>
        </div>
        <div className="bg-white p-6 rounded-lg border shadow-sm">
          <p className="text-sm font-medium text-muted-foreground uppercase tracking-wider">Total Weekly Hours</p>
          <p className="text-3xl font-bold mt-2">
            {clients.reduce((acc, c) => acc + (c.subscriptionStatus === "active" ? c.weeklyHours : 0), 0)}
          </p>
        </div>
        <div className="bg-white p-6 rounded-lg border shadow-sm">
          <p className="text-sm font-medium text-muted-foreground uppercase tracking-wider">Pending Checkout</p>
          <p className="text-3xl font-bold mt-2">{clients.filter(c => !c.subscriptionStatus).length}</p>
        </div>
      </div>

      {clients.length === 0 ? (
        <div className="bg-white border rounded-lg p-12 text-center text-muted-foreground">
          No billing data yet. Clients will appear here once they are added to the system.
        </div>
      ) : (
        <div className="bg-white border rounded-lg overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Company</TableHead>
                <TableHead>Support Block</TableHead>
                <TableHead>Usage (This Week)</TableHead>
                <TableHead>Overflow</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Period End</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {clients.map((client) => {
                const usage = calculateWeeklyUsage(client.timeEntries, client.weeklyHours);
                const pendingApprovals = client.requests.length;
                
                return (
                  <TableRow key={client.id}>
                    <TableCell className="font-medium">{client.companyName}</TableCell>
                    <TableCell>
                      <Badge variant="outline">{client.planType}</Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-col gap-1">
                        <span className={cn("text-sm font-bold", usage.isOverLimit ? "text-red-600" : usage.isNearLimit ? "text-orange-600" : "text-slate-900")}>
                          {(usage.includedMinutesThisWeek / 60).toFixed(1)} / {client.weeklyHours} hrs
                        </span>
                        <div className="h-1.5 w-24 bg-slate-100 rounded-full overflow-hidden">
                          <div 
                            className={cn("h-full transition-all", usage.isOverLimit ? "bg-red-500" : usage.isNearLimit ? "bg-orange-500" : "bg-primary")} 
                            style={{ width: `${Math.min(usage.percentUsed, 100)}%` }}
                          />
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-col gap-1">
                        <span className="text-sm font-medium">{(usage.overflowMinutesThisWeek / 60).toFixed(1)} hrs</span>
                        {pendingApprovals > 0 && (
                          <Badge variant="default" className="text-[10px] px-1 py-0 bg-orange-500 hover:bg-orange-600 flex items-center gap-1 w-fit">
                            <AlertTriangle className="h-2 w-2" />
                            {pendingApprovals} Pending
                          </Badge>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      {client.subscriptionStatus ? (
                        <Badge variant={client.subscriptionStatus === "active" ? "default" : "destructive"}>
                          {client.subscriptionStatus}
                        </Badge>
                      ) : (
                        <span className="text-xs text-muted-foreground italic">No subscription</span>
                      )}
                    </TableCell>
                    <TableCell className="text-muted-foreground text-sm">
                      {client.subscriptionCurrentPeriodEnd 
                        ? format(new Date(client.subscriptionCurrentPeriodEnd), "MMM d, yyyy")
                        : "-"}
                    </TableCell>
                    <TableCell className="text-right">
                      <Link 
                        href={`/admin/clients/${client.id}`}
                        className="text-primary hover:underline text-sm font-medium inline-flex items-center"
                      >
                        Manage <ExternalLink className="ml-1 h-3 w-3" />
                      </Link>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}
