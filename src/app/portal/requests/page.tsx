import { auth } from "@/auth";
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
import { PlusCircle } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { OverflowStatus } from "@/generated/prisma/client";

export const dynamic = "force-dynamic";

export default async function PortalRequests() {
  const session = await auth();
  const clientId = session?.user?.clientId;

  if (!clientId) {
    return <div>Client not found.</div>;
  }

  const requests = await prisma.supportRequest.findMany({
    where: { clientId },
    orderBy: { updatedAt: "desc" },
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Your requests</h1>
          <p className="text-muted-foreground">Track and manage your solar operations requests.</p>
        </div>
        <Link 
          href="/portal/requests/new" 
          className={cn(buttonVariants({ variant: "default" }), "flex items-center gap-2")}
        >
          <PlusCircle className="h-4 w-4" />
          New request
        </Link>
      </div>

      {requests.length === 0 ? (
        <div className="bg-white border rounded-lg p-12 text-center">
          <div className="mx-auto w-12 h-12 bg-slate-100 rounded-full flex items-center justify-center text-slate-400 mb-4">
            <ClipboardList className="h-6 w-6" />
          </div>
          <h3 className="text-lg font-medium text-slate-900">No requests yet</h3>
          <p className="text-muted-foreground mt-1 max-w-xs mx-auto">Submit your first solar operations support request to get started.</p>
          <div className="mt-6">
            <Link href="/portal/requests/new" className={buttonVariants({ variant: "outline" })}>
              Submit First Request
            </Link>
          </div>
        </div>
      ) : (
        <div className="bg-white border rounded-lg overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Request Title</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Urgency</TableHead>
                <TableHead>Last Updated</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {requests.map((request) => (
                <TableRow key={request.id}>
                  <TableCell>
                    <div className="flex flex-col">
                      <span className="font-medium text-slate-900">{request.title}</span>
                      <span className="text-xs text-muted-foreground truncate max-w-[250px]">{request.supportNeeded}</span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-col gap-1">
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className="capitalize">
                          {request.status.replace("_", " ").toLowerCase()}
                        </Badge>
                        {(request.status === "NEEDS_INFO" || request.needsInfo) && (
                          <Badge variant="destructive" className="text-[10px] px-1 py-0">Action Needed</Badge>
                        )}
                      </div>
                      {request.overflowStatus !== OverflowStatus.NOT_NEEDED && (
                        <span className="text-[10px] text-muted-foreground italic">
                          Overflow: {request.overflowStatus.replace("_", " ").toLowerCase()}
                        </span>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    <span className="text-sm capitalize">{request.urgency.toLowerCase()}</span>
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {format(new Date(request.updatedAt), "MMM d, yyyy")}
                  </TableCell>
                  <TableCell className="text-right">
                    <Link 
                      href={`/portal/requests/${request.id}`}
                      className="text-primary hover:underline text-sm font-medium"
                    >
                      View Details
                    </Link>
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

function ClipboardList({ className }: { className?: string }) {
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
      <rect width="8" height="4" x="8" y="2" rx="1" ry="1"/>
      <path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"/>
      <path d="M12 11h4"/>
      <path d="M12 16h4"/>
      <path d="M8 11h.01"/>
      <path d="M8 16h.01"/>
    </svg>
  );
}
