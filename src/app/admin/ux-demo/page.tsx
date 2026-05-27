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

/** Primary actions — emerald, not orange/black */
const btnPrimary =
  "bg-emerald-600 text-white hover:bg-emerald-700 focus-visible:ring-emerald-600/30";

/** Subtle brand accent — orange glow only, no fill */
const brandGlow =
  "ring-1 ring-orange-500/15 shadow-[0_0_0_1px_rgba(249,115,22,0.06),0_4px_20px_-4px_rgba(249,115,22,0.18)]";

const brandGlowHover =
  "hover:ring-orange-500/25 hover:shadow-[0_0_0_1px_rgba(249,115,22,0.1),0_6px_24px_-4px_rgba(249,115,22,0.22)]";

function workStateBadgeClass(state: string) {
  switch (state) {
    case "In progress":
      return "border-blue-200 bg-blue-50 text-blue-800";
    case "Needs info":
      return "border-amber-200 bg-amber-50 text-amber-900";
    case "New":
      return "border-slate-200 bg-slate-50 text-slate-700";
    default:
      return "border-slate-200 bg-white text-slate-600";
  }
}

function priorityBadgeClass(priority: string) {
  if (priority === "P1") return "border-red-200 bg-red-50 text-red-800";
  return "border-slate-200 bg-slate-50 text-slate-600";
}

function clientStatusBadgeClass(status: string) {
  switch (status) {
    case "Healthy":
      return "border-emerald-200 bg-emerald-50 text-emerald-800";
    case "Needs info":
      return "border-amber-200 bg-amber-50 text-amber-900";
    case "Near limit":
      return "border-orange-200 bg-orange-50/80 text-orange-900";
    default:
      return "border-slate-200 bg-slate-50 text-slate-600";
  }
}

export default function AdminUxDemoPage() {
  return (
    <div className="space-y-5">
      <div
        className={cn(
          "rounded-xl border border-slate-200 bg-white p-4 sm:p-5",
          brandGlow,
        )}
      >
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
              UX Demo
            </p>
            <h1 className="text-2xl font-semibold tracking-tight text-slate-900">
              Delivery-first command dashboard
            </h1>
            <p className="mt-1 text-sm text-slate-600">
              Work in, work out. Active clients first, leads still visible.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Link
              href="/admin/clients?status=ACTIVE"
              className={cn(
                buttonVariants({ variant: "outline", size: "sm" }),
                "border-slate-200 text-slate-700 hover:bg-slate-50",
              )}
            >
              Active Clients
            </Link>
            <Link
              href="/admin/requests"
              className={cn(buttonVariants({ size: "sm" }), btnPrimary)}
            >
              Open Work Queue
            </Link>
          </div>
        </div>
      </div>

      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {kpis.map((kpi) => (
          <Card key={kpi.label} className="border-slate-200 shadow-none">
            <CardContent className="flex items-center justify-between p-4">
              <div>
                <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
                  {kpi.label}
                </p>
                <p className="mt-1 text-2xl font-semibold text-slate-900">{kpi.value}</p>
                <p className="text-xs text-slate-500">{kpi.note}</p>
              </div>
              <div className="rounded-lg bg-slate-100 p-2">
                <kpi.icon className="h-4 w-4 text-slate-600" />
              </div>
            </CardContent>
          </Card>
        ))}
      </section>

      <section className="grid gap-4 xl:grid-cols-[1.65fr_1fr]">
        <div className="space-y-4">
          <Card className="border-slate-200 shadow-none">
            <CardHeader className="flex flex-row items-center justify-between pb-3">
              <CardTitle className="text-base font-semibold text-slate-900">
                Active clients
              </CardTitle>
              <Link
                href="/admin/clients?status=ACTIVE"
                className="text-xs font-medium text-emerald-700 hover:text-emerald-800 hover:underline"
              >
                View all
              </Link>
            </CardHeader>
            <CardContent className="space-y-2">
              {activeClients.map((client, index) => (
                <Link
                  key={client.id}
                  href={`/admin/clients/${client.id}`}
                  className={cn(
                    "grid gap-2 rounded-lg border border-slate-200 bg-white p-3 transition-all sm:grid-cols-[1.4fr_1fr_1.1fr_1fr_auto] sm:items-center",
                    brandGlowHover,
                    index === 0 && brandGlow,
                  )}
                >
                  <div>
                    <p className="font-medium text-slate-900">{client.company}</p>
                    <p className="text-xs text-slate-500">{client.contact}</p>
                  </div>
                  <div className="text-xs text-slate-600">
                    <p className="font-medium text-slate-700">Next</p>
                    <p>{client.nextStep}</p>
                  </div>
                  <p className="text-xs font-medium text-slate-700">{client.usage}</p>
                  <Badge
                    variant="outline"
                    className={cn("w-fit text-[10px] font-medium", clientStatusBadgeClass(client.status))}
                  >
                    {client.status}
                  </Badge>
                  <ArrowUpRight className="h-4 w-4 text-slate-400" />
                </Link>
              ))}
            </CardContent>
          </Card>

          <Card className="border-slate-200 shadow-none">
            <CardHeader className="flex flex-row items-center justify-between pb-3">
              <CardTitle className="text-base font-semibold text-slate-900">
                Work queue
              </CardTitle>
              <div className="flex items-center gap-2">
                <Badge
                  variant="outline"
                  className="border-emerald-200 bg-emerald-50 text-[10px] font-medium text-emerald-800"
                >
                  Do now
                </Badge>
                <Link
                  href="/admin/requests"
                  className="text-xs font-medium text-slate-600 hover:text-slate-900 hover:underline"
                >
                  Full queue
                </Link>
              </div>
            </CardHeader>
            <CardContent className="space-y-2">
              {queueItems.map((item) => (
                <div
                  key={item.id}
                  className="grid gap-2 rounded-lg border border-slate-200 p-3 sm:grid-cols-[70px_1fr_90px_110px_80px] sm:items-center"
                >
                  <Badge
                    variant="outline"
                    className={cn("w-fit text-[10px] font-medium", priorityBadgeClass(item.priority))}
                  >
                    {item.priority}
                  </Badge>
                  <div>
                    <p className="text-sm font-medium text-slate-900">{item.title}</p>
                    <p className="text-xs text-slate-500">{item.client}</p>
                  </div>
                  <p className="text-xs text-slate-500">{item.age} old</p>
                  <Badge
                    variant="outline"
                    className={cn("w-fit text-[10px] font-medium", workStateBadgeClass(item.state))}
                  >
                    {item.state}
                  </Badge>
                  <Button size="sm" className={cn("h-8", btnPrimary)}>
                    Open
                  </Button>
                </div>
              ))}
            </CardContent>
          </Card>

          <Card className="border-slate-200 shadow-none">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-slate-700">
                Leads lane
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {leadsLane.map((lead) => (
                <div
                  key={lead.company}
                  className="flex items-center justify-between rounded-lg border border-slate-200 bg-slate-50/50 p-3"
                >
                  <div>
                    <p className="text-sm font-medium text-slate-900">{lead.company}</p>
                    <p className="text-xs text-slate-500">{lead.stage}</p>
                  </div>
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-8 border-slate-200 text-slate-700 hover:bg-white"
                  >
                    {lead.action}
                  </Button>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>

        <div className="space-y-4">
          <Card className={cn("border-slate-200 shadow-none", brandGlow)}>
            <CardHeader className="pb-3">
              <CardTitle className="text-base font-semibold text-slate-900">
                Quick execution
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
                <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
                  Current focus
                </p>
                <p className="mt-1 text-sm font-medium text-slate-900">
                  Struxient — Permit follow-up
                </p>
                <p className="text-xs text-slate-500">Timer running · 00:27</p>
                <div className="mt-3 flex gap-2">
                  <Button size="sm" variant="outline" className="h-8 border-slate-200">
                    Pause
                  </Button>
                  <Button size="sm" className={cn("h-8", btnPrimary)}>
                    Log 27m
                  </Button>
                </div>
              </div>

              <div className="grid gap-2">
                {[
                  { icon: Plus, label: "Log work request" },
                  { icon: Clock3, label: "Quick time entry" },
                  { icon: Phone, label: "Send client update" },
                ].map(({ icon: Icon, label }) => (
                  <button
                    key={label}
                    type="button"
                    className="flex items-center justify-between rounded-lg border border-slate-200 p-3 text-left transition-colors hover:bg-slate-50"
                  >
                    <span className="flex items-center gap-2 text-sm font-medium text-slate-800">
                      <Icon className="h-4 w-4 text-slate-500" />
                      {label}
                    </span>
                    <ArrowUpRight className="h-4 w-4 text-slate-400" />
                  </button>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card className="border-slate-200 shadow-none">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-slate-700">Today</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <TodayRow icon={Flame} tone="warning">
                2 requests past SLA
              </TodayRow>
              <TodayRow icon={CalendarDays} tone="neutral">
                1 discovery call at 2:30 PM
              </TodayRow>
              <TodayRow icon={Inbox} tone="neutral">
                3 client replies waiting
              </TodayRow>
              <TodayRow icon={CheckCircle2} tone="success">
                5 tasks completed today
              </TodayRow>
            </CardContent>
          </Card>
        </div>
      </section>
    </div>
  );
}

function TodayRow({
  icon: Icon,
  tone,
  children,
}: {
  icon: React.ComponentType<{ className?: string }>;
  tone: "success" | "warning" | "neutral";
  children: React.ReactNode;
}) {
  const iconClass =
    tone === "success"
      ? "text-emerald-600"
      : tone === "warning"
        ? "text-amber-600"
        : "text-slate-500";

  return (
    <div className="flex items-center gap-2 text-sm text-slate-700">
      <Icon className={cn("h-4 w-4 shrink-0", iconClass)} />
      {children}
    </div>
  );
}
