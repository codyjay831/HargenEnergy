"use client";

import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import Link from "next/link";
import { format } from "date-fns";
import { Phone } from "lucide-react";

export type ProspectCardData = {
  id: string;
  name: string;
  website?: string | null;
  city?: string | null;
  state?: string | null;
  status: string;
  fitScore?: number | null;
  contactCount: number;
  activityCount: number;
  lastContactedAt?: Date | null;
  nextFollowUpAt?: Date | null;
  primaryPhone?: string | null;
  topPainTag?: string | null;
};

export function ProspectCard({ company }: { company: ProspectCardData }) {
  return (
    <Card>
      <CardContent className="p-4 space-y-3">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <p className="font-semibold text-sm">{company.name}</p>
            {company.website && (
              <p className="text-xs text-muted-foreground truncate">{company.website.replace(/^https?:\/\//, "")}</p>
            )}
            <p className="text-xs text-muted-foreground mt-1">
              {[company.city, company.state].filter(Boolean).join(", ")}
            </p>
          </div>
          <Badge variant="secondary" className="text-[10px] capitalize shrink-0">
            {company.status.toLowerCase().replace(/_/g, " ")}
          </Badge>
        </div>

        <div className="flex flex-wrap gap-2">
          {company.fitScore != null && company.fitScore > 0 && (
            <Badge variant="outline" className="text-[10px]">
              Fit {company.fitScore}/5
            </Badge>
          )}
          {company.topPainTag && (
            <Badge variant="outline" className="text-[10px] bg-amber-50">
              {company.topPainTag}
            </Badge>
          )}
          <Badge variant="outline" className="text-[10px]">
            {company.contactCount} contacts
          </Badge>
        </div>

        <div className="flex flex-wrap gap-2 items-center">
          {company.primaryPhone && (
            <a
              href={`tel:${company.primaryPhone}`}
              className={cn(buttonVariants({ variant: "outline", size: "sm" }), "h-8 text-xs")}
            >
              <Phone className="h-3 w-3 mr-1" />
              Call
            </a>
          )}
          <Link href={`/admin/outreach/companies/${company.id}`}>
            <Button size="sm" className="h-8 text-xs">
              View
            </Button>
          </Link>
          {company.nextFollowUpAt && (
            <span
              className={`text-[10px] ${new Date(company.nextFollowUpAt) < new Date() ? "text-red-600 font-medium" : "text-muted-foreground"}`}
            >
              Follow-up {format(new Date(company.nextFollowUpAt), "MMM d")}
            </span>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

export function ProspectCardGrid({ companies }: { companies: ProspectCardData[] }) {
  return (
    <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:hidden">
      {companies.map((company) => (
        <ProspectCard key={company.id} company={company} />
      ))}
    </div>
  );
}
