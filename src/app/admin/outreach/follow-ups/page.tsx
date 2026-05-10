import { prisma } from "@/lib/prisma";
import { format, isBefore, isToday, isThisWeek } from "date-fns";
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
import { OutreachCompanyStatus } from "@/generated/prisma/client";
import { Calendar, AlertCircle, Clock } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function OutreachFollowUpsPage() {
  const followUps = await prisma.outreachCompany.findMany({
    where: {
      nextFollowUpAt: { not: null },
      status: { notIn: [OutreachCompanyStatus.WON, OutreachCompanyStatus.DO_NOT_CONTACT, OutreachCompanyStatus.BAD_FIT] }
    },
    orderBy: {
      nextFollowUpAt: "asc",
    },
    include: {
      contacts: {
        where: { isPrimary: true },
        take: 1
      }
    }
  });

  const overdue = followUps.filter(f => isBefore(new Date(f.nextFollowUpAt!), new Date()) && !isToday(new Date(f.nextFollowUpAt!)));
  const today = followUps.filter(f => isToday(new Date(f.nextFollowUpAt!)));
  const upcoming = followUps.filter(f => !isBefore(new Date(f.nextFollowUpAt!), new Date()) && !isToday(new Date(f.nextFollowUpAt!)));

  const renderTable = (companies: typeof followUps, title: string, icon: any, color: string) => (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        {icon}
        <h2 className={`text-lg font-semibold ${color}`}>{title} ({companies.length})</h2>
      </div>
      <div className="bg-white border rounded-lg overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Company</TableHead>
              <TableHead>Primary Contact</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Due Date</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {companies.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                  No follow-ups in this category.
                </TableCell>
              </TableRow>
            ) : (
              companies.map((company) => (
                <TableRow key={company.id}>
                  <TableCell className="font-medium">{company.name}</TableCell>
                  <TableCell>
                    <div className="flex flex-col">
                      <span className="text-sm">{company.contacts[0]?.name || "N/A"}</span>
                      <span className="text-xs text-muted-foreground">{company.contacts[0]?.email || ""}</span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant="secondary" className="capitalize">
                      {company.status.toLowerCase().replace(/_/g, " ")}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <span className={isBefore(new Date(company.nextFollowUpAt!), new Date()) && !isToday(new Date(company.nextFollowUpAt!)) ? "text-red-600 font-bold" : ""}>
                      {format(new Date(company.nextFollowUpAt!), "MMM d, yyyy")}
                    </span>
                  </TableCell>
                  <TableCell className="text-right">
                    <Link 
                      href={`/admin/outreach/companies/${company.id}`}
                      className="text-primary hover:underline text-sm font-medium"
                    >
                      Take Action
                    </Link>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );

  return (
    <div className="space-y-10">
      <div>
        <h1 className="text-2xl font-bold">Follow-up Queue</h1>
        <p className="text-muted-foreground text-sm">Stay on top of your outreach and never miss a reply.</p>
      </div>

      {renderTable(overdue, "Overdue", <AlertCircle className="h-5 w-5 text-red-600" />, "text-red-600")}
      {renderTable(today, "Due Today", <Clock className="h-5 w-5 text-amber-600" />, "text-amber-600")}
      {renderTable(upcoming, "Upcoming", <Calendar className="h-5 w-5 text-blue-600" />, "text-blue-600")}
    </div>
  );
}
