import { prisma } from "@/lib/prisma";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Megaphone,
  Users,
  MessageSquare,
  Calendar,
  CheckCircle2,
  Clock,
  Search,
  Inbox,
  Phone,
} from "lucide-react";
import { format } from "date-fns";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import {
  OutreachCompanyStatus,
  OutreachDiscoveryStatus,
} from "@/generated/prisma/client";
import { Button, buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { CSVImportButton } from "@/components/forms/CSVImportButton";
import { CSVExportButton } from "@/components/forms/CSVExportButton";

export const dynamic = "force-dynamic";

export default async function OutreachDashboard() {
  const [
    totalLeads,
    contactedCount,
    repliedCount,
    interestedCount,
    unsavedDiscoveries,
    followUpsDue,
    recentActivity,
    topLeads,
  ] = await Promise.all([
    prisma.outreachCompany.count(),
    prisma.outreachCompany.count({ where: { status: OutreachCompanyStatus.CONTACTED } }),
    prisma.outreachCompany.count({ where: { status: OutreachCompanyStatus.REPLIED } }),
    prisma.outreachCompany.count({ where: { status: OutreachCompanyStatus.INTERESTED } }),
    prisma.outreachDiscovery.count({
      where: {
        status: { in: [OutreachDiscoveryStatus.NEW, OutreachDiscoveryStatus.REVIEWING] },
      },
    }),
    prisma.outreachCompany.findMany({
      where: {
        nextFollowUpAt: { lte: new Date() },
        status: {
          notIn: [
            OutreachCompanyStatus.WON,
            OutreachCompanyStatus.DO_NOT_CONTACT,
            OutreachCompanyStatus.BAD_FIT,
          ],
        },
      },
      take: 5,
      orderBy: { nextFollowUpAt: "asc" },
    }),
    prisma.outreachActivity.findMany({
      take: 5,
      orderBy: { date: "desc" },
      include: { company: true },
    }),
    prisma.outreachCompany.findMany({
      where: {
        fitScore: { gte: 3 },
        status: OutreachCompanyStatus.LEAD_FOUND,
        contacts: { some: { phone: { not: null } } },
      },
      orderBy: [{ fitScore: "desc" }, { updatedAt: "desc" }],
      take: 5,
      include: {
        contacts: { where: { isPrimary: true }, take: 1 },
      },
    }),
  ]);

  const stats = [
    { name: "Total Leads", value: totalLeads, icon: Users, color: "text-blue-600" },
    { name: "Contacted", value: contactedCount, icon: Megaphone, color: "text-amber-600" },
    { name: "Replies", value: repliedCount, icon: MessageSquare, color: "text-purple-600" },
    { name: "Interested", value: interestedCount, icon: CheckCircle2, color: "text-green-600" },
  ];

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold">Outreach Dashboard</h1>
        <p className="text-muted-foreground text-sm">
          Track your progress in finding and partnering with solar contractors.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card className="border-primary/20 bg-primary/5">
          <CardContent className="py-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-3">
              <Inbox className="h-5 w-5 text-primary" />
              <div>
                <p className="font-semibold text-sm">{unsavedDiscoveries} unsaved discoveries</p>
                <p className="text-xs text-muted-foreground">
                  Search results waiting for triage
                </p>
              </div>
            </div>
            <Link href="/admin/outreach/discovery">
              <Button size="sm">Open inbox</Button>
            </Link>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="py-4 flex flex-wrap items-center gap-3">
            <p className="text-sm font-medium mr-2">Quick Actions:</p>
            <Link href="/admin/outreach/search">
              <Button size="sm">
                <Search className="h-4 w-4 mr-2" />
                Find Contractors
              </Button>
            </Link>
            <CSVImportButton />
            <CSVExportButton />
            <Link href="/admin/outreach/companies">
              <Button size="sm" variant="outline">
                <Users className="h-4 w-4 mr-2" />
                View Prospects
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {stats.map((stat) => (
          <Card key={stat.name}>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">{stat.name}</CardTitle>
              <stat.icon className={`h-4 w-4 ${stat.color}`} />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stat.value}</div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Phone className="h-4 w-4 text-primary" />
            Top leads to contact
          </CardTitle>
        </CardHeader>
        <CardContent>
          {topLeads.length === 0 ? (
            <p className="text-sm text-muted-foreground py-2">
              Save discoveries and run enrichment to rank leads here.
            </p>
          ) : (
            <div className="space-y-3">
              {topLeads.map((lead) => (
                <div
                  key={lead.id}
                  className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between p-3 border rounded-lg"
                >
                  <div>
                    <p className="font-medium text-sm">{lead.name}</p>
                    <p className="text-xs text-muted-foreground">
                      Fit {lead.fitScore}/5
                      {lead.contacts[0]?.phone ? ` · ${lead.contacts[0].phone}` : ""}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    {lead.contacts[0]?.phone && (
                      <a
                        href={`tel:${lead.contacts[0].phone}`}
                        className={cn(buttonVariants({ variant: "outline", size: "sm" }))}
                      >
                        Call
                      </a>
                    )}
                    <Link href={`/admin/outreach/companies/${lead.id}`}>
                      <Button size="sm">Open</Button>
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5 text-primary" />
              Follow-ups Due
            </CardTitle>
          </CardHeader>
          <CardContent>
            {followUpsDue.length === 0 ? (
              <p className="text-sm text-muted-foreground py-4 text-center">
                No follow-ups due today. Good job!
              </p>
            ) : (
              <div className="space-y-4">
                {followUpsDue.map((company) => (
                  <div
                    key={company.id}
                    className="flex items-center justify-between p-3 border rounded-lg"
                  >
                    <div>
                      <p className="font-medium text-sm">{company.name}</p>
                      <p className="text-xs text-red-600 font-medium">
                        Due {format(new Date(company.nextFollowUpAt!), "MMM d")}
                      </p>
                    </div>
                    <Link
                      href={`/admin/outreach/companies/${company.id}`}
                      className="text-primary hover:underline text-sm font-medium"
                    >
                      Action
                    </Link>
                  </div>
                ))}
                <Link
                  href="/admin/outreach/follow-ups"
                  className="block text-center text-sm text-primary hover:underline pt-2"
                >
                  View all follow-ups
                </Link>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5 text-primary" />
              Recent Activity
            </CardTitle>
          </CardHeader>
          <CardContent>
            {recentActivity.length === 0 ? (
              <p className="text-sm text-muted-foreground py-4 text-center">
                No recent activity logged.
              </p>
            ) : (
              <div className="space-y-4">
                {recentActivity.map((activity) => (
                  <div key={activity.id} className="flex items-start gap-3 p-3 border rounded-lg">
                    <div className="mt-1">
                      <Badge variant="outline" className="text-[10px] uppercase px-1 py-0">
                        {activity.activityType.replace(/_/g, " ")}
                      </Badge>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{activity.company.name}</p>
                      <p className="text-xs text-muted-foreground line-clamp-1">
                        {activity.notes || "No notes provided"}
                      </p>
                      <p className="text-[10px] text-muted-foreground mt-1">
                        {format(new Date(activity.date), "MMM d, h:mm a")} via {activity.channel}
                      </p>
                    </div>
                  </div>
                ))}
                <Link
                  href="/admin/outreach/activities"
                  className="block text-center text-sm text-primary hover:underline pt-2"
                >
                  View full timeline
                </Link>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
