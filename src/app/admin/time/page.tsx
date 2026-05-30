import { prisma } from "@/lib/prisma";
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogTrigger 
} from "@/components/ui/dialog";
import { buttonVariants } from "@/components/ui/button";
import { Plus, Clock } from "lucide-react";
import { cn } from "@/lib/utils";
import { adminClientTabHref } from "@/lib/admin-client-tabs";
import Link from "next/link";
import { TimeReview } from "@/components/admin/TimeReview";

export const dynamic = "force-dynamic";

export default async function AdminTime() {
  const [timeEntries, clients] = await Promise.all([
    prisma.timeEntry.findMany({
      include: {
        client: true,
        supportRequest: {
          select: { title: true }
        },
      },
      orderBy: {
        date: "desc",
      },
    }),
    prisma.client.findMany({
      where: { status: "ACTIVE" },
      orderBy: { companyName: "asc" },
    }),
  ]);

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">Time Tracking</h1>
        <Dialog>
          <DialogTrigger className={cn(buttonVariants({ variant: "default" }))}>
            <Plus className="mr-2 h-4 w-4" />
            Log Time
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Log Support Time</DialogTitle>
            </DialogHeader>
            <div className="py-4">
              {clients.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center">No active clients found. You must have an active client to log time.</p>
              ) : (
                <div className="space-y-4">
                  <p className="text-sm text-muted-foreground">Select a client below to log time against their support block.</p>
                  <div className="grid grid-cols-1 gap-2 max-h-[300px] overflow-y-auto p-1">
                    {clients.map(client => (
                      <Link 
                        key={client.id}
                        href={adminClientTabHref(client.id, "overview")}
                        className="flex items-center justify-between p-3 border rounded-lg hover:bg-slate-50 transition-colors"
                      >
                        <span className="font-medium text-sm">{client.companyName}</span>
                        <Clock className="h-4 w-4 text-muted-foreground" />
                      </Link>
                    ))}
                  </div>
                  <p className="text-xs text-muted-foreground text-center italic">Time can also be logged directly on a specific Support Request.</p>
                </div>
              )}
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {timeEntries.length === 0 ? (
        <div className="bg-white border rounded-lg p-12 text-center text-muted-foreground">
          No time entries yet. Once you start working on requests, you can log your time here.
        </div>
      ) : (
        <TimeReview entries={timeEntries} />
      )}
    </div>
  );
}
