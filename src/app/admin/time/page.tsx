import { prisma } from "@/lib/prisma";
import { format } from "date-fns";
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

export const dynamic = "force-dynamic";

export default async function AdminTime() {
  const [timeEntries, clients] = await Promise.all([
    prisma.timeEntry.findMany({
      include: {
        client: true,
        supportRequest: true,
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
                        href={`/admin/clients/${client.id}`}
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
        <div className="bg-white border rounded-lg overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Client</TableHead>
                <TableHead>Request</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Description</TableHead>
                <TableHead className="text-right">Minutes</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {timeEntries.map((entry) => (
                <TableRow key={entry.id}>
                  <TableCell className="text-sm">
                    {format(new Date(entry.date), "MMM d, yyyy")}
                  </TableCell>
                  <TableCell>
                    <Link href={`/admin/clients/${entry.clientId}`} className="hover:underline font-medium">
                      {entry.client.companyName}
                    </Link>
                  </TableCell>
                  <TableCell>
                    {entry.supportRequest ? (
                      <Link href={`/admin/requests/${entry.supportRequestId}`} className="hover:underline text-xs text-muted-foreground truncate max-w-[150px] block">
                        {entry.supportRequest.title}
                      </Link>
                    ) : (
                      <span className="text-xs text-muted-foreground italic">General</span>
                    )}
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline" className="text-[10px] uppercase">
                      {entry.billableType.replace("_", " ")}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-sm max-w-[300px] truncate">
                    {entry.description}
                  </TableCell>
                  <TableCell className="text-right font-bold">
                    {entry.minutes}m
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}
