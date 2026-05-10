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
import { Button } from "@/components/ui/button";
import { Plus, Search } from "lucide-react";
import { CSVImportButton } from "@/components/forms/CSVImportButton";
import { CSVExportButton } from "@/components/forms/CSVExportButton";

export const dynamic = "force-dynamic";

export default async function OutreachCompaniesPage() {
  const companies = await prisma.outreachCompany.findMany({
    orderBy: {
      createdAt: "desc",
    },
    include: {
      _count: {
        select: { contacts: true, activities: true }
      }
    }
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Outreach Prospects</h1>
          <p className="text-muted-foreground text-sm">Manage and track potential solar contractor partners.</p>
        </div>
        <div className="flex items-center gap-2">
          <CSVImportButton />
          <CSVExportButton />
          <Link href="/admin/outreach/search">
            <Button size="sm">
              <Search className="h-4 w-4 mr-2" />
              Find Contractors
            </Button>
          </Link>
        </div>
      </div>
      
      {companies.length === 0 ? (
        <div className="bg-white border rounded-lg p-12 text-center text-muted-foreground">
          <div className="max-w-md mx-auto space-y-4">
            <p>No outreach prospects yet. Use the Contractor Finder to search for solar companies or import a CSV list.</p>
            <Link href="/admin/outreach/search">
              <Button variant="outline">Go to Contractor Finder</Button>
            </Link>
          </div>
        </div>
      ) : (
        <div className="bg-white border rounded-lg overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Company</TableHead>
                <TableHead>Location</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Stats</TableHead>
                <TableHead>Last Contact</TableHead>
                <TableHead>Next Follow-up</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {companies.map((company) => (
                <TableRow key={company.id}>
                  <TableCell>
                    <div className="flex flex-col">
                      <span className="font-medium">{company.name}</span>
                      {company.website && (
                        <span className="text-xs text-muted-foreground truncate max-w-[200px]">
                          {company.website.replace(/^https?:\/\//, "")}
                        </span>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    <span className="text-sm">
                      {company.city ? `${company.city}, ` : ""}{company.state || ""}
                    </span>
                  </TableCell>
                  <TableCell>
                    <Badge variant="secondary" className="capitalize">
                      {company.status.toLowerCase().replace(/_/g, " ")}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-2 text-xs text-muted-foreground">
                      <span>{company._count.contacts} contacts</span>
                      <span>•</span>
                      <span>{company._count.activities} logs</span>
                    </div>
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {company.lastContactedAt 
                      ? format(new Date(company.lastContactedAt), "MMM d, yyyy")
                      : "Never"}
                  </TableCell>
                  <TableCell className="text-sm">
                    {company.nextFollowUpAt ? (
                      <span className={new Date(company.nextFollowUpAt) < new Date() ? "text-red-600 font-medium" : "text-muted-foreground"}>
                        {format(new Date(company.nextFollowUpAt), "MMM d, yyyy")}
                      </span>
                    ) : (
                      <span className="text-muted-foreground italic text-xs">Not set</span>
                    )}
                  </TableCell>
                  <TableCell className="text-right">
                    <Link 
                      href={`/admin/outreach/companies/${company.id}`}
                      className="text-primary hover:underline text-sm font-medium"
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
