import { prisma } from "@/lib/prisma";
import { format } from "date-fns";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function OutreachActivitiesPage() {
  const activities = await prisma.outreachActivity.findMany({
    orderBy: { date: "desc" },
    take: 100,
    include: {
      company: { select: { id: true, name: true } },
      createdBy: { select: { name: true } },
    },
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/admin/outreach" className={cn(buttonVariants({ variant: "ghost", size: "icon" }))}>
          <ArrowLeft className="h-4 w-4" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold">Outreach Activity Timeline</h1>
          <p className="text-muted-foreground text-sm">Full history of logged outreach activity.</p>
        </div>
      </div>

      {activities.length === 0 ? (
        <div className="border rounded-lg p-10 text-center text-muted-foreground text-sm">
          No activity logged yet.
        </div>
      ) : (
        <div className="space-y-4">
          {activities.map((activity) => (
            <div key={activity.id} className="border rounded-lg p-4 space-y-2">
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-center gap-2 flex-wrap">
                  <Badge variant="outline" className="text-[10px] uppercase">
                    {activity.activityType.replace(/_/g, " ")}
                  </Badge>
                  <span className="text-xs text-muted-foreground">{activity.channel}</span>
                  <Link
                    href={`/admin/outreach/companies/${activity.company.id}`}
                    className="text-sm font-medium text-primary hover:underline"
                  >
                    {activity.company.name}
                  </Link>
                </div>
                <span className="text-xs text-muted-foreground">
                  {format(new Date(activity.date), "MMM d, yyyy h:mm a")}
                </span>
              </div>
              {activity.notes && <p className="text-sm">{activity.notes}</p>}
              {activity.responseSummary && (
                <p className="text-xs italic text-muted-foreground">
                  Response: {activity.responseSummary}
                </p>
              )}
              <p className="text-[10px] text-muted-foreground">
                Logged by {activity.createdBy?.name || "System"}
              </p>
            </div>
          ))}
        </div>
      )}

      <Link href="/admin/outreach/follow-ups">
        <Button variant="outline" size="sm">
          View follow-up queue
        </Button>
      </Link>
    </div>
  );
}
