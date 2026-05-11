import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import Link from "next/link";
import { format } from "date-fns";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  ArrowLeft,
  Users,
  Globe,
  MapPin,
  Calendar,
  Clock,
} from "lucide-react";
import { cn, safeExternalHref } from "@/lib/utils";
import { OutreachActivityForm } from "@/components/forms/OutreachActivityForm";
import { OutreachContactList } from "@/components/forms/OutreachContactList";
import { OutreachTemplateList } from "@/components/forms/OutreachTemplateList";
import { EnrichmentTools } from "@/components/forms/EnrichmentTools";

export const dynamic = "force-dynamic";

interface OutreachCompanyDetailPageProps {
  params: Promise<{ id: string }>;
}

export default async function OutreachCompanyDetailPage({ params }: OutreachCompanyDetailPageProps) {
  const resolvedParams = await params;
  const id = resolvedParams?.id;

  if (!id) notFound();

  const company = await prisma.outreachCompany.findUnique({
    where: { id },
    include: {
      contacts: {
        orderBy: { isPrimary: "desc" }
      },
      activities: {
        orderBy: { date: "desc" },
        include: { createdBy: true }
      }
    }
  });

  if (!company) notFound();

  const enrichmentData =
    company.enrichmentData && typeof company.enrichmentData === "object"
      ? (company.enrichmentData as Record<string, unknown>)
      : null;
  const permitStackEvidence =
    enrichmentData?.permitStack && typeof enrichmentData.permitStack === "object"
      ? (enrichmentData.permitStack as Record<string, unknown>)
      : null;
  const permitNumbers = Array.isArray(permitStackEvidence?.permitNumbers)
    ? permitStackEvidence.permitNumbers.filter(
        (value): value is string => typeof value === "string" && value.trim().length > 0
      )
    : [];
  const looksLikePermitDescription =
    !permitStackEvidence &&
    company.leadSource?.toLowerCase() === "permitstack" &&
    (company.name.length > 60 ||
      /\b(revision|resubmit|install|system|solarapp|permit)\b/i.test(company.name));

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link 
            href="/admin/outreach/companies" 
            className={cn(buttonVariants({ variant: "ghost", size: "icon" }))}
          >
            <ArrowLeft className="h-4 w-4" />
          </Link>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">{company.name}</h1>
            <div className="flex items-center gap-2 mt-1">
              <Badge variant="secondary" className="capitalize">
                {company.status.toLowerCase().replace(/_/g, " ")}
              </Badge>
              <p className="text-xs text-muted-foreground">Added {format(new Date(company.createdAt), "MMM d, yyyy")}</p>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {company.website && (
            <a 
              href={safeExternalHref(company.website) || "#"} 
              target="_blank" 
              rel="noopener noreferrer"
              className={cn(buttonVariants({ variant: "outline", size: "sm" }))}
            >
              <Globe className="h-4 w-4 mr-2" />
              Visit Website
            </a>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left Column: Company Info & Contacts */}
        <div className="lg:col-span-2 space-y-8">
          {looksLikePermitDescription && (
            <Card className="border-amber-200 bg-amber-50">
              <CardContent className="py-4">
                <p className="text-sm text-amber-900">
                  This saved prospect name looks like permit description text rather than a named
                  contractor. Review the record before outreach.
                </p>
              </CardContent>
            </Card>
          )}

          {permitStackEvidence && (
            <Card>
              <CardHeader>
                <CardTitle>PermitStack evidence</CardTitle>
              </CardHeader>
              <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-xs font-semibold uppercase text-muted-foreground">Contractor</p>
                  <p className="font-medium">
                    {typeof permitStackEvidence.contractorName === "string"
                      ? permitStackEvidence.contractorName
                      : company.name}
                  </p>
                </div>
                <div>
                  <p className="text-xs font-semibold uppercase text-muted-foreground">
                    Permit numbers
                  </p>
                  <p className="font-medium">
                    {permitNumbers.length > 0
                      ? permitNumbers.join(", ")
                      : typeof permitStackEvidence.samplePermitNumber === "string"
                        ? permitStackEvidence.samplePermitNumber
                        : "Not listed"}
                  </p>
                </div>
                <div>
                  <p className="text-xs font-semibold uppercase text-muted-foreground">
                    Latest permit date
                  </p>
                  <p className="font-medium">
                    {typeof permitStackEvidence.lastPermitDate === "string"
                      ? permitStackEvidence.lastPermitDate
                      : "Not listed"}
                  </p>
                </div>
                <div>
                  <p className="text-xs font-semibold uppercase text-muted-foreground">
                    Jurisdiction
                  </p>
                  <p className="font-medium">
                    {typeof permitStackEvidence.jurisdiction === "string"
                      ? permitStackEvidence.jurisdiction
                      : "Not listed"}
                  </p>
                </div>
                <div className="md:col-span-2">
                  <p className="text-xs font-semibold uppercase text-muted-foreground">Job site</p>
                  <p className="font-medium">
                    {typeof permitStackEvidence.address === "string" && permitStackEvidence.address
                      ? permitStackEvidence.address
                      : [permitStackEvidence.city, permitStackEvidence.state]
                          .filter((value) => typeof value === "string" && value)
                          .join(", ") || "Not listed"}
                  </p>
                </div>
              </CardContent>
            </Card>
          )}

          <Card>
            <CardHeader>
              <CardTitle>Company Details</CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-4">
                <div className="flex items-start gap-3">
                  <Users className="h-4 w-4 text-muted-foreground mt-1" />
                  <div>
                    <p className="text-sm font-medium">{company.name}</p>
                    <p className="text-xs text-muted-foreground">Company Name</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <MapPin className="h-4 w-4 text-muted-foreground mt-1" />
                  <div>
                    <p className="text-sm font-medium">
                      {company.city ? `${company.city}, ` : ""}{company.state || "N/A"}
                    </p>
                    <p className="text-xs text-muted-foreground">Location</p>
                  </div>
                </div>
                {company.serviceArea && (
                  <div className="flex items-start gap-3">
                    <Globe className="h-4 w-4 text-muted-foreground mt-1" />
                    <div>
                      <p className="text-sm font-medium">{company.serviceArea}</p>
                      <p className="text-xs text-muted-foreground">Service Area</p>
                    </div>
                  </div>
                )}
              </div>
              <div className="space-y-4">
                <div className="flex items-start gap-3">
                  <Calendar className="h-4 w-4 text-muted-foreground mt-1" />
                  <div>
                    <p className="text-sm font-medium">
                      {company.nextFollowUpAt 
                        ? format(new Date(company.nextFollowUpAt), "MMM d, yyyy") 
                        : "No follow-up scheduled"}
                    </p>
                    <p className="text-xs text-muted-foreground">Next Follow-up</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <Clock className="h-4 w-4 text-muted-foreground mt-1" />
                  <div>
                    <p className="text-sm font-medium">
                      {company.lastContactedAt 
                        ? format(new Date(company.lastContactedAt), "MMM d, yyyy") 
                        : "Never contacted"}
                    </p>
                    <p className="text-xs text-muted-foreground">Last Contact</p>
                  </div>
                </div>
              </div>
              <div className="md:col-span-2 pt-4 border-t">
                <p className="text-xs font-semibold uppercase text-muted-foreground mb-2">Internal Notes</p>
                <p className="text-sm text-slate-600 whitespace-pre-wrap">
                  {company.notes || "No internal notes for this prospect."}
                </p>
              </div>
              {company.painTags.length > 0 && (
                <div className="md:col-span-2 pt-4">
                  <p className="text-xs font-semibold uppercase text-muted-foreground mb-2">Pain Points / Tags</p>
                  <div className="flex flex-wrap gap-2">
                    {company.painTags.map((tag, i) => (
                      <Badge key={i} variant="outline" className="bg-amber-50 text-amber-700 border-amber-200">
                        {tag}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Contacts</CardTitle>
            </CardHeader>
            <CardContent>
              <OutreachContactList companyId={company.id} initialContacts={company.contacts} />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Activity Timeline</CardTitle>
            </CardHeader>
            <CardContent>
              {company.activities.length === 0 ? (
                <p className="text-sm text-muted-foreground py-4 text-center">No activity logged yet.</p>
              ) : (
                <div className="space-y-6">
                  {company.activities.map((activity) => (
                    <div key={activity.id} className="relative pl-6 border-l pb-6 last:pb-0">
                      <div className="absolute left-[-5px] top-1 h-2 w-2 rounded-full bg-primary" />
                      <div className="flex flex-col gap-1">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <Badge variant="outline" className="text-[10px] uppercase">
                              {activity.activityType.replace(/_/g, " ")}
                            </Badge>
                            <span className="text-xs font-medium">{activity.channel}</span>
                          </div>
                          <span className="text-[10px] text-muted-foreground">
                            {format(new Date(activity.date), "MMM d, yyyy h:mm a")}
                          </span>
                        </div>
                        <p className="text-sm mt-1">{activity.notes}</p>
                        {activity.responseSummary && (
                          <div className="mt-2 p-2 bg-slate-50 rounded text-xs italic">
                            Response: {activity.responseSummary}
                          </div>
                        )}
                        <p className="text-[10px] text-muted-foreground mt-1">
                          Logged by {activity.createdBy?.name || "System"}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Right Column: Actions & Templates */}
        <div className="space-y-8">
          <EnrichmentTools companyId={company.id} />

          <Card className="border-primary/20 bg-primary/5">
            <CardHeader>
              <CardTitle className="text-base">Log New Activity</CardTitle>
            </CardHeader>
            <CardContent>
              <OutreachActivityForm companyId={company.id} contacts={company.contacts} />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Message Templates</CardTitle>
            </CardHeader>
            <CardContent>
              <OutreachTemplateList company={company} />
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
