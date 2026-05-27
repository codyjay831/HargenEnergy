import Link from "next/link";
import {
  ArrowUpRight,
  CalendarDays,
  CheckCircle2,
  Clock3,
  Flame,
  Inbox,
  Phone,
  Plus,
  TriangleAlert,
  Users,
  Wrench,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button, buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const kpis = [
  { label: "Active Clients", value: 12, note: "2 near limit", icon: Users },
  { label: "Open Work", value: 18, note: "7 in progress", icon: Wrench },
  { label: "Needs Info", value: 3, note: "Follow up today", icon: TriangleAlert },
  { label: "Hours This Week", value: "26.5", note: "3.0 overflow", icon: Clock3 },
];

const activeClients = [
  {
    id: "struxient",
    company: "Struxient",
    contact: "Cody Barbour",
    status: "Healthy",
    nextStep: "Review permit packet",
    usage: "8.5 / 10h",
  },
  {
    id: "test-inc",
    company: "Test",
    contact: "Design",
    status: "Needs info",
    nextStep: "Client response pending",
    usage: "4.1 / 10h",
  },
  {
    id: "atlantic",
    company: "Atlantic Retrofit",
    contact: "Maya James",
    status: "Near limit",
    nextStep: "Approve overflow",
    usage: "9.6 / 10h",
  },
];

const queueItems = [
  {
    id: "wrq-2201",
    client: "Struxient",
    title: "Permit follow-up, utility escalation",
    priority: "P1",
    age: "2h",
    state: "In progress",
  },
  {
    id: "wrq-2202",
    client: "Atlantic Retrofit",
    title: "Site design revision from county comments",
    priority: "P1",
    age: "5h",
    state: "New",
  },
  {
    id: "wrq-2203",
    client: "Test",
    title: "Panel relocation estimate and scheduling",
    priority: "P2",
    age: "1d",
    state: "Needs info",
  },
];

const leadsLane = [
  { company: "Northline Homes", stage: "Needs review", action: "Open discovery" },
  { company: "Beacon Realty", stage: "Qualified", action: "Send scheduling link" },
];

function stateBadgeClass(state: string) {
  if (state === "In progress") return "bg-orange-500 text-white";
  if (state === "Needs info") return "bg-black text-white";
  return "bg-white text-black border border-black/20";
}

function clientStatusBadgeClass(status: string) {
  if (status === "Needs info") return "bg-black text-white";
  if (status === "Near limit") return "bg-orange-500 text-white";
  return "bg-white text-black border border-black/20";
}

export default function AdminUxDemoPage() {
  return (
    <div className="space-y-5">
      <div className="rounded-2xl border border-black/10 bg-white p-4 sm:p-5">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-orange-600">
              UX Demo
            </p>
            <h1 className="text-2xl font-bold tracking-tight text-black">
              Delivery-first command dashboard
            </h1>
            <p className="mt-1 text-sm text-black/65">
              Work in, work out. Active clients first, leads still visible.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Link
              href="/admin/clients?status=ACTIVE"
              className={cn(
                buttonVariants({ variant: "outline", size: "sm" }),
                "border-black/20 hover:bg-orange-50 hover:text-black",
              )}
            >
              Active Clients
            </Link>
            <Link href="/admin/requests" className={buttonVariants({ size: "sm" })}>
              Open Work Queue
            </Link>
          </div>
        </div>
      </div>

      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {kpis.map((kpi) => (
          <Card key={kpi.label} className="border-black/10 shadow-none">
            <CardContent className="flex items-center justify-between p-4">
              <div>
                <p className="text-xs font-medium uppercase tracking-wide text-black/60">
                  {kpi.label}
                </p>
                <p className="mt-1 text-2xl font-bold text-black">{kpi.value}</p>
                <p className="text-xs text-black/65">{kpi.note}</p>
              </div>
              <div className="rounded-xl bg-orange-500/10 p-2">
                <kpi.icon className="h-4 w-4 text-orange-600" />
              </div>
            </CardContent>
          </Card>
        ))}
      </section>

      <section className="grid gap-4 xl:grid-cols-[1.65fr_1fr]">
        <div className="space-y-4">
          <Card className="border-black/10 shadow-none">
            <CardHeader className="flex flex-row items-center justify-between pb-3">
              <CardTitle className="text-base">Active clients (one tap open)</CardTitle>
              <Link
                href="/admin/clients?status=ACTIVE"
                className="text-xs font-medium text-orange-600 hover:underline"
              >
                View all
              </Link>
            </CardHeader>
            <CardContent className="space-y-2">
              {activeClients.map((client) => (
                <Link
                  key={client.id}
                  href={`/admin/clients/${client.id}`}
                  className="grid gap-2 rounded-xl border border-black/10 bg-white p-3 transition-colors hover:border-orange-300 hover:bg-orange-50/40 sm:grid-cols-[1.4fr_1fr_1.1fr_1fr_auto] sm:items-center"
                >
                  <div>
                    <p className="font-semibold text-black">{client.company}</p>
                    <p className="text-xs text-black/60">{client.contact}</p>
                  </div>
                  <div className="text-xs text-black/70">
                    <p className="font-medium text-black">Next</p>
                    <p>{client.nextStep}</p>
                  </div>
                  <p className="text-xs font-medium text-black">{client.usage}</p>
                  <Badge className={cn("w-fit text-[10px]", clientStatusBadgeClass(client.status))}>
                    {client.status}
                  </Badge>
                  <ArrowUpRight className="h-4 w-4 text-black/50" />
                </Link>
              ))}
            </CardContent>
          </Card>

          <Card className="border-black/10 shadow-none">
            <CardHeader className="flex flex-row items-center justify-between pb-3">
              <CardTitle className="text-base">Work queue</CardTitle>
              <div className="flex items-center gap-2">
                <Badge className="bg-orange-500 text-white">Do now</Badge>
                <Link href="/admin/requests" className="text-xs text-orange-600 hover:underline">
                  Full queue
                </Link>
              </div>
            </CardHeader>
            <CardContent className="space-y-2">
              {queueItems.map((item) => (
                <div
                  key={item.id}
                  className="grid gap-2 rounded-xl border border-black/10 p-3 sm:grid-cols-[70px_1fr_90px_110px_80px] sm:items-center"
                >
                  <Badge className={cn("w-fit text-[10px]", stateBadgeClass(item.state))}>
                    {item.priority}
                  </Badge>
                  <div>
                    <p className="text-sm font-semibold text-black">{item.title}</p>
                    <p className="text-xs text-black/60">{item.client}</p>
                  </div>
                  <p className="text-xs font-medium text-black/70">{item.age} old</p>
                  <Badge className={cn("w-fit text-[10px]", stateBadgeClass(item.state))}>
                    {item.state}
                  </Badge>
                  <Button size="sm" className="h-8 bg-black text-white hover:bg-black/90">
                    Open
                  </Button>
                </div>
              ))}
            </CardContent>
          </Card>

          <Card className="border-black/10 shadow-none">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm">Leads lane (compact secondary)</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {leadsLane.map((lead) => (
                <div
                  key={lead.company}
                  className="flex items-center justify-between rounded-xl border border-black/10 p-3"
                >
                  <div>
                    <p className="text-sm font-semibold text-black">{lead.company}</p>
                    <p className="text-xs text-black/60">{lead.stage}</p>
                  </div>
                  <Button size="sm" variant="outline" className="h-8 border-black/20">
                    {lead.action}
                  </Button>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>

        <div className="space-y-4">
          <Card className="border-black/10 shadow-none">
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Right rail: quick execution</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="rounded-xl border border-black/10 bg-orange-50 p-3">
                <p className="text-xs font-medium uppercase tracking-wide text-orange-700">
                  Current focus
                </p>
                <p className="mt-1 text-sm font-semibold text-black">
                  Struxient - Permit follow-up
                </p>
                <p className="text-xs text-black/65">Timer running: 00:27</p>
                <div className="mt-3 flex gap-2">
                  <Button size="sm" className="h-8 bg-orange-500 text-white hover:bg-orange-600">
                    Pause
                  </Button>
                  <Button size="sm" variant="outline" className="h-8 border-black/20">
                    Log 27m
                  </Button>
                </div>
              </div>

              <div className="grid gap-2">
                <button
                  type="button"
                  className="flex items-center justify-between rounded-xl border border-black/10 p-3 text-left transition-colors hover:bg-black/[0.03]"
                >
                  <span className="flex items-center gap-2 text-sm font-medium text-black">
                    <Plus className="h-4 w-4 text-orange-600" />
                    Log work request
                  </span>
                  <ArrowUpRight className="h-4 w-4 text-black/50" />
                </button>
                <button
                  type="button"
                  className="flex items-center justify-between rounded-xl border border-black/10 p-3 text-left transition-colors hover:bg-black/[0.03]"
                >
                  <span className="flex items-center gap-2 text-sm font-medium text-black">
                    <Clock3 className="h-4 w-4 text-orange-600" />
                    Quick time entry
                  </span>
                  <ArrowUpRight className="h-4 w-4 text-black/50" />
                </button>
                <button
                  type="button"
                  className="flex items-center justify-between rounded-xl border border-black/10 p-3 text-left transition-colors hover:bg-black/[0.03]"
                >
                  <span className="flex items-center gap-2 text-sm font-medium text-black">
                    <Phone className="h-4 w-4 text-orange-600" />
                    Send client update
                  </span>
                  <ArrowUpRight className="h-4 w-4 text-black/50" />
                </button>
              </div>
            </CardContent>
          </Card>

          <Card className="border-black/10 shadow-none">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm">Today</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center gap-2 text-sm text-black">
                <Flame className="h-4 w-4 text-orange-600" />
                2 requests past SLA
              </div>
              <div className="flex items-center gap-2 text-sm text-black">
                <CalendarDays className="h-4 w-4 text-orange-600" />
                1 discovery call at 2:30 PM
              </div>
              <div className="flex items-center gap-2 text-sm text-black">
                <Inbox className="h-4 w-4 text-orange-600" />
                3 client replies waiting
              </div>
              <div className="flex items-center gap-2 text-sm text-black">
                <CheckCircle2 className="h-4 w-4 text-orange-600" />
                5 tasks completed today
              </div>
            </CardContent>
          </Card>
        </div>
      </section>
    </div>
  );
}
