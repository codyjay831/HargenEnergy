import { prisma } from "@/lib/prisma";
import Link from "next/link";
import { format } from "date-fns";
import { Badge } from "@/components/ui/badge";
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table";
import { Urgency, OverflowStatus } from "@prisma/client";

export const dynamic = "force-dynamic";

export default async function AdminRequests() {
  const requests = await prisma.supportRequest.findMany({
    include: {
      client: true,
      timeEntries: {
        select: { minutes: true }
      }
    },
    orderBy: {
      createdAt: "desc",
    },
  });

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">Support Requests</h1>
      </div>

      {requests.length === 0 ? (
        <div className="bg-white border rounded-lg p-12 text-center text-muted-foreground">
          No support requests yet. Submitted requests from the public form will appear here.
        </div>
      ) : (
        <div className="bg-white border rounded-lg overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Company</TableHead>
                <TableHead>Contact</TableHead>
                <TableHead>Urgency</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Time</TableHead>
                <TableHead>Date</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {requests.map((request) => (
                <TableRow key={request.id}>
                  <TableCell className="font-medium">
                    {request.client.companyName}
                    {request.needsInfo && (
                      <Badge variant="destructive" className="ml-2 text-[10px] px-1 py-0">
                        Needs Info
                      </Badge>
                    )}
                  </TableCell>
                  <TableCell>{request.client.contactName}</TableCell>
                  <TableCell>
                    <Badge variant={getUrgencyVariant(request.urgency)}>
                      {request.urgency.replace("_", " ")}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-col gap-1">
                      <Badge variant="outline">
                        {request.status.replace("_", " ")}
                      </Badge>
                      {request.overflowStatus !== OverflowStatus.NOT_NEEDED && (
                        <Badge variant={getOverflowVariant(request.overflowStatus)} className="text-[10px] px-1 py-0 w-fit">
                          {request.overflowStatus.replace("_", " ")}
                        </Badge>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    {request.timeEntries.length > 0 ? (
                      <span className="text-sm font-medium">
                        {request.timeEntries.reduce((acc, curr) => acc + curr.minutes, 0)}m
                      </span>
                    ) : (
                      <span className="text-xs text-muted-foreground italic">0m</span>
                    )}
                  </TableCell>
                  <TableCell className="text-muted-foreground text-sm">
                    {format(new Date(request.createdAt), "MMM d, yyyy")}
                  </TableCell>
                  <TableCell className="text-right">
                    <Link 
                      href={`/admin/requests/${request.id}`}
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

function getUrgencyVariant(urgency: Urgency) {
  switch (urgency) {
    case Urgency.URGENT: return "destructive";
    case Urgency.THIS_WEEK: return "default";
    case Urgency.NORMAL: return "secondary";
    case Urgency.ONGOING: return "outline";
    default: return "secondary";
  }
}

function getOverflowVariant(status: OverflowStatus) {
  switch (status) {
    case OverflowStatus.NEEDS_APPROVAL: return "default";
    case OverflowStatus.APPROVED: return "secondary";
    case OverflowStatus.DECLINED: return "destructive";
    case OverflowStatus.DEFERRED: return "outline";
    default: return "outline";
  }
}
