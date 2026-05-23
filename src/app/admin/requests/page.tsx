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
import {
  EngagementType,
  Urgency,
  OverflowStatus,
  SupportRequestKind,
} from "@/generated/prisma/client";
import { getEngagementLabel } from "@/lib/engagement";
import { PRODUCT_LANGUAGE } from "@/lib/product-language";
import { StatusBadge } from "@/components/ui/status-badge";
import { PriorityButtons } from "@/components/admin/PriorityButtons";
import { buttonVariants } from "@/components/ui/button";

export const dynamic = "force-dynamic";

export default async function AdminRequests() {
  const requests = await prisma.supportRequest.findMany({
    where: { kind: SupportRequestKind.CLIENT_OPS },
    include: {
      client: true,
      timeEntries: {
        select: { minutes: true }
      }
    },
    orderBy: [
      { priorityRank: "asc" },
      { createdAt: "desc" }
    ],
  });

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">{PRODUCT_LANGUAGE.workRequest.listTitle}</h1>
      </div>

      {requests.length === 0 ? (
        <div className="bg-white border rounded-lg p-12 text-center text-muted-foreground">
          No {PRODUCT_LANGUAGE.workRequest.plural.toLowerCase()} yet. Portal submissions and logged off-channel work will appear here.
        </div>
      ) : (
        <div className="bg-white border rounded-lg overflow-hidden shadow-sm">
          <Table>
            <TableHeader>
              <TableRow className="bg-slate-50/50">
                <TableHead className="w-[80px]">Priority</TableHead>
                <TableHead>Company</TableHead>
                <TableHead>Request Title</TableHead>
                <TableHead>Urgency</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Time</TableHead>
                <TableHead>Date</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {requests.map((request) => (
                <TableRow key={request.id} className="hover:bg-slate-50/50 transition-colors">
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <div className="flex items-center justify-center w-6 h-6 rounded-full bg-slate-100 text-[10px] font-bold text-slate-600 shrink-0">
                        {request.priorityRank ? `#${request.priorityRank}` : "—"}
                      </div>
                      <PriorityButtons requestId={request.id} currentPriority={request.priorityRank} />
                    </div>
                  </TableCell>
                  <TableCell className="font-medium">
                    <div className="flex flex-col">
                      <span className="text-sm">{request.client.companyName}</span>
                      <span className="text-[10px] text-muted-foreground uppercase tracking-tight">{request.client.contactName}</span>
                      <Badge variant="outline" className="text-[9px] w-fit mt-0.5">
                        {getEngagementLabel(request.client.engagementType)}
                      </Badge>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Link href={`/admin/requests/${request.id}`} className="text-sm font-semibold hover:underline truncate max-w-[200px]">
                        {request.title}
                      </Link>
                      {request.needsInfo && (
                        <Badge variant="destructive" className="text-[10px] px-1 py-0 h-4">
                          Needs Info
                        </Badge>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant={getUrgencyVariant(request.urgency)} className="text-[10px] uppercase">
                      {request.urgency.replace("_", " ")}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-col gap-1">
                      <StatusBadge status={request.status} />
                      {request.overflowStatus !== OverflowStatus.NOT_NEEDED && (
                        <Badge variant={getOverflowVariant(request.overflowStatus)} className="text-[10px] px-1 py-0 w-fit">
                          {request.overflowStatus.replace("_", " ")}
                        </Badge>
                      )}
                      {request.client.engagementType === EngagementType.REQUEST_BASED && request.handoffTier && (
                        <Badge variant="secondary" className="text-[10px] px-1 py-0 w-fit">
                          {request.handoffTier}
                        </Badge>
                      )}
                      {request.client.engagementType === EngagementType.REQUEST_BASED && request.pricingMode && (
                        <Badge variant="outline" className="text-[10px] px-1 py-0 w-fit">
                          {request.pricingMode.replace(/_/g, " ")}
                        </Badge>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    {request.timeEntries.length > 0 ? (
                      <span className="text-sm font-bold text-slate-700">
                        {request.timeEntries.reduce((acc, curr) => acc + curr.minutes, 0)}m
                      </span>
                    ) : (
                      <span className="text-xs text-muted-foreground italic">0m</span>
                    )}
                  </TableCell>
                  <TableCell className="text-muted-foreground text-sm">
                    {format(new Date(request.createdAt), "MMM d")}
                  </TableCell>
                  <TableCell className="text-right">
                    <Link 
                      href={`/admin/requests/${request.id}`}
                      className={buttonVariants({ variant: "ghost", size: "sm" })}
                    >
                      View
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
