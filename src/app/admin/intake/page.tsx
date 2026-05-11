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
  TableRow,
} from "@/components/ui/table";
import { SupportRequestKind, Urgency } from "@/generated/prisma/client";

export const dynamic = "force-dynamic";

export default async function AdminIntakePage() {
  const leads = await prisma.supportRequest.findMany({
    where: { kind: SupportRequestKind.PROSPECT_INTAKE },
    include: { client: true },
    orderBy: { createdAt: "desc" },
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Inbound leads</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Walkthrough and activation conversations from the public request form.
        </p>
      </div>

      {leads.length === 0 ? (
        <div className="bg-white border rounded-lg p-12 text-center text-muted-foreground">
          No inbound leads yet. New submissions from the public walkthrough form will appear here.
        </div>
      ) : (
        <div className="bg-white border rounded-lg overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Company</TableHead>
                <TableHead>Contact</TableHead>
                <TableHead>Focus</TableHead>
                <TableHead>Plan interest</TableHead>
                <TableHead>Urgency</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Date</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {leads.map((lead) => (
                <TableRow key={lead.id}>
                  <TableCell className="font-medium">
                    {lead.client.companyName}
                  </TableCell>
                  <TableCell>{lead.client.contactName}</TableCell>
                  <TableCell className="max-w-[220px] truncate">
                    {lead.title || lead.supportNeeded || "—"}
                  </TableCell>
                  <TableCell>
                    <Badge variant="secondary">{lead.client.planType}</Badge>
                  </TableCell>
                  <TableCell>
                    <Badge variant={getUrgencyVariant(lead.urgency)}>
                      {lead.urgency.replace("_", " ")}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline">
                      {lead.status.replace("_", " ")}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-muted-foreground text-sm">
                    {format(new Date(lead.createdAt), "MMM d, yyyy")}
                  </TableCell>
                  <TableCell className="text-right">
                    <Link
                      href={`/admin/requests/${lead.id}`}
                      className="text-primary hover:underline text-sm font-medium"
                    >
                      Review
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
    case Urgency.URGENT:
      return "destructive";
    case Urgency.THIS_WEEK:
      return "default";
    case Urgency.NORMAL:
      return "secondary";
    case Urgency.ONGOING:
      return "outline";
    default:
      return "secondary";
  }
}

