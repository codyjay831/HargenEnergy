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
} from "lucide-react";
import { format } from "date-fns";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { OutreachCompanyStatus } from "@/generated/prisma/client";
import { Button } from "@/components/ui/button";
import { CSVImportButton } from "@/components/forms/CSVImportButton";
import { CSVExportButton } from "@/components/forms/CSVExportButton";

export const dynamic = "force-dynamic";

export default async function OutreachDashboard() {
  const [
    totalLeads,
    contactedCount,
    repliedCount,
    interestedCount,
    followUpsDue,
    recentActivity
  ] = await Promise.all([
    prisma.outreachCompany.count(),
    prisma.outreachCompany.count({ where: { status: OutreachCompanyStatus.CONTACTED } }),
    prisma.outreachCompany.count({ where: { status: OutreachCompanyStatus.REPLIED } }),
    prisma.outreachCompany.count({ where: { status: OutreachCompanyStatus.INTERESTED } }),
    prisma.outreachCompany.findMany({
      where: {
        nextFollowUpAt: { lte: new Date() },
        status: { notIn: [OutreachCompanyStatus.WON, OutreachCompanyStatus.DO_NOT_CONTACT, OutreachCompanyStatus.BAD_FIT] }
      },
      take: 5,
      orderBy: { nextFollowUpAt: "asc" }
    }),
    prisma.outreachActivity.findMany({
      take: 5,
      orderBy: { date: "desc" },
      include: { company: true }
    })
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
        <p className="text-muted-foreground text-sm">Track your progress in finding and partnering with solar contractors.</p>
      </div>

      <Card className="bg-slate-50 border-dashed">
        <CardContent className="py-4 flex flex-wrap items-center gap-4">
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
              View All Prospects
            </Button>
          </Link>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
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

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Follow-ups Due */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5 text-primary" />
              Follow-ups Due
            </CardTitle>
          </CardHeader>
          <CardContent>
            {followUpsDue.length === 0 ? (
              <p className="text-sm text-muted-foreground py-4 text-center">No follow-ups due today. Good job!</p>
            ) : (
              <div className="space-y-4">
                {followUpsDue.map((company) => (
                  <div key={company.id} className="flex items-center justify-between p-3 border rounded-lg">
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
                <Link href="/admin/outreach/follow-ups" className="block text-center text-sm text-primary hover:underline pt-2">
                  View all follow-ups
                </Link>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Recent Activity */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5 text-primary" />
              Recent Activity
            </CardTitle>
          </CardHeader>
          <CardContent>
            {recentActivity.length === 0 ? (
              <p className="text-sm text-muted-foreground py-4 text-center">No recent activity logged.</p>
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
                      <p className="text-xs text-muted-foreground line-clamp-1">{activity.notes || "No notes provided"}</p>
                      <p className="text-[10px] text-muted-foreground mt-1">
                        {format(new Date(activity.date), "MMM d, h:mm a")} via {activity.channel}
                      </p>
                    </div>
                  </div>
                ))}
                <Link href="/admin/outreach/activities" className="block text-center text-sm text-primary hover:underline pt-2">
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
