import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  FileText,
  Clock,
  MessageSquare,
  LayoutGrid,
  Zap,
  Users,
  CheckCircle2,
  ChevronRight,
} from "lucide-react";

// ---------------------------------------------------------------------------
// Data
// ---------------------------------------------------------------------------

const queueItems = [
  {
    title: "Permit follow-up overdue",
    context: "AHJ · 18 days pending",
    status: "Blocked",
    pill: "text-red-600 bg-red-50",
  },
  {
    title: "Utility app: missing document",
    context: "SCE interconnection · NEM incomplete",
    status: "Needs follow-up",
    pill: "text-amber-600 bg-amber-50",
  },
  {
    title: "Customer update needed",
    context: "Rivera install · 3 days no contact",
    status: "Needs follow-up",
    pill: "text-amber-600 bg-amber-50",
  },
  {
    title: "CRM cleanup — Q2 jobs",
    context: "14 records need status update",
    status: "In queue",
    pill: "text-zinc-600 bg-zinc-100",
  },
  {
    title: "Enphase setup pending",
    context: "Martinez system · post-install config",
    status: "Waiting",
    pill: "text-zinc-600 bg-zinc-100",
  },
];

const problems = [
  {
    title: "Permit and utility delays",
    body: "Applications go in and nothing happens. No dedicated follow-up means AHJ deadlines slip and jobs wait weeks for responses that should take days.",
  },
  {
    title: "Customer communication gaps",
    body: "Homeowners stop getting updates. That silence turns into calls to your sales rep, bad reviews, and cancellations. Someone has to own the update cadence.",
  },
  {
    title: "Messy job status and CRM data",
    body: "When records aren't kept current, no one knows what's stuck, what's done, or what needs action today. Decisions get made from incomplete information.",
  },
];

const services = [
  {
    Icon: FileText,
    title: "Quote & Proposal Building",
    desc: "Accurate quotes built from your site survey data so your sales team keeps moving.",
    example: "Build proposal from survey notes and equipment specs",
  },
  {
    Icon: Clock,
    title: "Permit & Utility Follow-up",
    desc: "Proactive follow-up with AHJs and utilities so applications don't sit idle.",
    example: "Call AHJ on permit pending 14+ days, document status",
  },
  {
    Icon: MessageSquare,
    title: "Customer Communication",
    desc: "Timely, professional updates to homeowners so they know where their project stands.",
    example: "Send project status update with current timeline",
  },
  {
    Icon: LayoutGrid,
    title: "CRM Cleanup & Management",
    desc: "Audit and update job records so you always know exactly where every project stands.",
    example: "Reconcile 12 stale job records with current status",
  },
  {
    Icon: Zap,
    title: "Enphase & Equipment Setup",
    desc: "Post-install configuration, monitoring activation, and commissioning support.",
    example: "Configure Enphase system and activate monitoring portal",
  },
  {
    Icon: Users,
    title: "Stuck Job Resolution",
    desc: "Identify exactly why a job is stalled, gather what is missing, and move it forward.",
    example: "Diagnose permit rejection, gather corrected docs, resubmit",
  },
];

const steps = [
  {
    n: "01",
    title: "Tell us what is stuck",
    desc: "Send the jobs, tasks, or backlog that need attention. Takes two minutes.",
  },
  {
    n: "02",
    title: "We organize the work",
    desc: "We identify priorities, missing info, and next actions against your support block.",
  },
  {
    n: "03",
    title: "We move it forward",
    desc: "We follow up, update records, and keep jobs from sitting idle.",
  },
];

const plans = [
  {
    name: "Light Support",
    hours: "2 hrs / week",
    best: "Small backlogs, occasional permit or utility follow-up, cleanup tasks.",
    items: ["1–2 stuck jobs per week", "Occasional follow-up calls", "CRM cleanup batches"],
    featured: false,
  },
  {
    name: "Core Support",
    hours: "5 hrs / week",
    best: "Steady weekly ops support for growing companies with active pipelines.",
    items: [
      "Ongoing permit & utility tracking",
      "Regular customer communication",
      "CRM management and record updates",
      "Quote support as needed",
    ],
    featured: true,
  },
  {
    name: "Priority Support",
    hours: "10 hrs / week",
    best: "Active companies running multiple crews and job pipelines simultaneously.",
    items: [
      "Multiple job pipelines managed",
      "Dedicated daily follow-up",
      "End-to-end stuck job resolution",
      "Enphase and equipment setup",
    ],
    featured: false,
  },
];

const ctaItems = [
  "Permit pending too long",
  "Utility application needs follow-up",
  "Customer needs an update",
  "CRM or job status is messy",
];

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default function Home() {
  return (
    <div className="flex flex-col">

      {/* ── Hero ──────────────────────────────────────────── */}
      <section className="border-b">
        <div className="max-w-6xl mx-auto px-6 py-16 lg:py-24">
          <div className="grid grid-cols-1 gap-12 lg:grid-cols-[1fr_460px] lg:gap-14 items-start">

            {/* Left column */}
            <div className="flex flex-col gap-5">
              <p className="text-xs font-semibold tracking-[0.1em] uppercase text-muted-foreground">
                Solar operations support for residential contractors
              </p>
              <h1 className="text-4xl sm:text-5xl font-semibold tracking-tight leading-[1.1]">
                Back-office solar support when jobs get stuck.
              </h1>
              <p className="text-[0.9375rem] text-muted-foreground leading-[1.7] max-w-[460px]">
                We help solar companies move permits, utility applications, customer updates, CRM cleanup, and job follow-up forward — without hiring another full-time office role.
              </p>
              <div className="flex flex-wrap gap-3 pt-1">
                <Link href="/request-help" className={cn(buttonVariants({ size: "lg" }))}>
                  Request Solar Ops Support
                </Link>
                <Link href="/how-it-works" className={cn(buttonVariants({ size: "lg", variant: "outline" }))}>
                  See how it works
                </Link>
              </div>
              <p className="text-xs text-muted-foreground border-l-2 border-border pl-3 leading-relaxed mt-1">
                For solar companies — not homeowners shopping for solar.
              </p>
            </div>

            {/* Right column: Ops Desk Snapshot */}
            <div className="rounded-xl border bg-card overflow-hidden shadow-sm">
              <div className="flex items-center justify-between px-4 py-3 border-b bg-muted/30">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-foreground/20" />
                  <span className="text-sm font-semibold">Ops Desk</span>
                  <span className="text-sm text-muted-foreground">· Active queue</span>
                </div>
                <span className="text-xs font-medium bg-muted text-muted-foreground rounded-md px-2 py-0.5">
                  5 open
                </span>
              </div>

              <div className="divide-y">
                {queueItems.map((item, i) => (
                  <div key={i} className="flex items-start justify-between gap-3 px-4 py-3">
                    <div className="flex items-start gap-2.5 min-w-0">
                      <div className="mt-[7px] w-1.5 h-1.5 rounded-full bg-muted-foreground/25 shrink-0" />
                      <div className="min-w-0">
                        <p className="text-sm font-medium leading-snug">{item.title}</p>
                        <p className="text-xs text-muted-foreground mt-0.5">{item.context}</p>
                      </div>
                    </div>
                    <span
                      className={cn(
                        "shrink-0 text-[0.6875rem] font-medium rounded-md px-2 py-0.5 whitespace-nowrap",
                        item.pill
                      )}
                    >
                      {item.status}
                    </span>
                  </div>
                ))}
              </div>

              <div className="px-4 py-2.5 border-t bg-muted/20">
                <p className="text-[0.6875rem] text-muted-foreground">
                  Illustrative example · Not real client data
                </p>
              </div>
            </div>

          </div>
        </div>
      </section>

      {/* ── Problem ───────────────────────────────────────── */}
      <section id="problem" className="border-b bg-neutral-50/80">
        <div className="max-w-6xl mx-auto px-6 py-16 lg:py-20">
          <div className="max-w-2xl mb-10">
            <h2 className="text-2xl font-semibold tracking-tight leading-snug">
              Solar jobs rarely get stuck in the field.<br className="hidden sm:block" />
              They get stuck between steps.
            </h2>
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            {problems.map((p, i) => (
              <div key={i} className="rounded-lg border bg-white p-5">
                <h3 className="text-sm font-semibold mb-2">{p.title}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">{p.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Services ──────────────────────────────────────── */}
      <section id="services" className="border-b">
        <div className="max-w-6xl mx-auto px-6 py-16 lg:py-20">
          <div className="flex items-end justify-between gap-6 flex-wrap mb-10">
            <h2 className="text-2xl font-semibold tracking-tight max-w-sm">
              Support for the work that keeps projects moving.
            </h2>
            <Link
              href="/services"
              className={cn(buttonVariants({ variant: "outline", size: "sm" }), "shrink-0")}
            >
              View all services
              <ChevronRight className="h-3.5 w-3.5" />
            </Link>
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {services.map(({ Icon, title, desc, example }, i) => (
              <div key={i} className="rounded-lg border bg-card p-5 flex flex-col gap-4">
                <Icon className="h-[1.125rem] w-[1.125rem] text-muted-foreground/50" strokeWidth={1.5} />
                <div className="flex flex-col gap-1">
                  <h3 className="text-sm font-semibold">{title}</h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">{desc}</p>
                </div>
                <p className="text-xs text-muted-foreground/60 font-mono border-t pt-3 mt-auto leading-relaxed">
                  e.g. {example}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── How it works ──────────────────────────────────── */}
      <section id="how-it-works" className="border-b bg-neutral-50/80">
        <div className="max-w-6xl mx-auto px-6 py-16 lg:py-20">
          <div className="mb-10">
            <p className="text-xs font-semibold tracking-[0.1em] uppercase text-muted-foreground mb-2">
              Process
            </p>
            <h2 className="text-2xl font-semibold tracking-tight">Simple support process.</h2>
          </div>
          <div className="grid grid-cols-1 gap-8 sm:grid-cols-3 sm:gap-0 sm:divide-x">
            {steps.map((step, i) => (
              <div key={i} className="sm:px-8 first:pl-0 last:pr-0 flex flex-col gap-3">
                <span className="text-[2.5rem] font-bold text-foreground/[0.08] leading-none tabular-nums">
                  {step.n}
                </span>
                <h3 className="text-sm font-semibold">{step.title}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">{step.desc}</p>
              </div>
            ))}
          </div>
          <div className="mt-8">
            <Link href="/how-it-works" className={cn(buttonVariants({ variant: "outline", size: "sm" }))}>
              See the full process
            </Link>
          </div>
        </div>
      </section>

      {/* ── Pricing ───────────────────────────────────────── */}
      <section id="pricing" className="border-b">
        <div className="max-w-6xl mx-auto px-6 py-16 lg:py-20">
          <div className="mb-10">
            <h2 className="text-2xl font-semibold tracking-tight">Flexible support blocks.</h2>
            <p className="mt-2 text-[0.9375rem] text-muted-foreground">
              Reserve weekly ops capacity that fits your current volume.
            </p>
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            {plans.map((plan, i) => (
              <div
                key={i}
                className={cn(
                  "rounded-lg border p-6 flex flex-col gap-5",
                  plan.featured
                    ? "border-foreground/25 bg-foreground/[0.02]"
                    : "bg-card"
                )}
              >
                <div>
                  {plan.featured && (
                    <p className="text-[0.6875rem] font-semibold tracking-[0.08em] uppercase text-muted-foreground mb-2">
                      Most common
                    </p>
                  )}
                  <h3 className="font-semibold">{plan.name}</h3>
                  <p className="text-[1.75rem] font-bold tracking-tight mt-1 tabular-nums">
                    {plan.hours}
                  </p>
                  <p className="text-sm text-muted-foreground mt-2 leading-relaxed">{plan.best}</p>
                </div>
                <ul className="flex flex-col gap-2 flex-1">
                  {plan.items.map((item, j) => (
                    <li key={j} className="flex items-start gap-2 text-sm text-muted-foreground">
                      <CheckCircle2 className="h-3.5 w-3.5 shrink-0 mt-0.5 text-foreground/20" />
                      {item}
                    </li>
                  ))}
                </ul>
                <Link
                  href="/request-help"
                  className={cn(
                    buttonVariants({ variant: plan.featured ? "default" : "outline" }),
                    "w-full"
                  )}
                >
                  Request this block
                </Link>
              </div>
            ))}
          </div>
          <div className="mt-5 rounded-lg border bg-muted/30 px-5 py-4 max-w-2xl">
            <p className="text-sm font-semibold mb-1">About capacity-based support</p>
            <p className="text-sm text-muted-foreground leading-relaxed">
              Support blocks reserve time, not unlimited help. If submitted work exceeds your block, we prioritize the highest-impact items first. Remaining work rolls over or can be approved as overflow.
            </p>
          </div>
        </div>
      </section>

      {/* ── Final CTA ─────────────────────────────────────── */}
      <section className="bg-zinc-950">
        <div className="max-w-6xl mx-auto px-6 py-16 lg:py-20">
          <div className="grid grid-cols-1 gap-10 lg:grid-cols-[1fr_auto] lg:gap-20 items-start">

            {/* Left */}
            <div className="max-w-md">
              <h2 className="text-2xl font-semibold tracking-tight text-white leading-snug">
                Tell us where your operations are stuck.
              </h2>
              <p className="mt-3 text-[0.9375rem] text-zinc-400 leading-relaxed">
                No long-term contracts. No hiring overhead. Just focused solar ops support when you need it.
              </p>
              <div className="mt-7">
                <Link
                  href="/request-help"
                  className={cn(
                    buttonVariants({ size: "lg" }),
                    "bg-white text-zinc-950 hover:bg-zinc-100 focus-visible:ring-zinc-300"
                  )}
                >
                  Request Solar Ops Support
                </Link>
              </div>
            </div>

            {/* Right: checklist panel */}
            <div className="rounded-lg border border-zinc-800 bg-zinc-900 p-5 lg:min-w-[260px]">
              <p className="text-[0.6875rem] font-semibold tracking-[0.1em] uppercase text-zinc-500 mb-4">
                Common reasons to reach out
              </p>
              <ul className="flex flex-col gap-3">
                {ctaItems.map((item, i) => (
                  <li key={i} className="flex items-center gap-2.5">
                    <div className="w-1.5 h-1.5 rounded-full bg-zinc-600 shrink-0" />
                    <span className="text-sm text-zinc-300">{item}</span>
                  </li>
                ))}
              </ul>
            </div>

          </div>
        </div>
      </section>

    </div>
  );
}
