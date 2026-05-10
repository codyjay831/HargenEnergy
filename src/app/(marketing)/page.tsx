import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  marketingCardBase as cardBase,
  marketingCardHover as cardHover,
  marketingChipNeutral as chipNeutral,
  marketingShell,
} from "@/components/marketing/marketing-styles";
import {
  FileText,
  Clock,
  MessageSquare,
  LayoutGrid,
  Zap,
  Users,
  ChevronRight,
} from "lucide-react";

// ---------------------------------------------------------------------------
// Data
// ---------------------------------------------------------------------------

/** Hero right column: service scope, not a product queue */
const takeOffYourPlate = [
  {
    title: "Permit follow-up",
    line: "AHJ calls, status checks, and resubmissions so permits do not sit idle.",
  },
  {
    title: "Utility application support",
    line: "Interconnection paperwork, missing docs, and utility follow-through.",
  },
  {
    title: "Customer updates",
    line: "Clear, timely messages to homeowners so they know what happens next.",
  },
  {
    title: "CRM cleanup",
    line: "Accurate job stages and notes so your team sees a truthful pipeline.",
  },
  {
    title: "Enphase & equipment setup",
    line: "Monitoring, activation, and post-install configuration support.",
  },
  {
    title: "Quote & proposal support",
    line: "Turn survey and equipment details into clean proposals your reps can send.",
  },
];

const problems = [
  {
    title: "Permit and utility delays",
    symptom: "Application went in. Then nothing.",
    body: "No dedicated follow-up means AHJ deadlines slip. Jobs wait weeks for responses that should take days.",
  },
  {
    title: "Customer communication gaps",
    symptom: "Customer hasn't heard back in days",
    body: "That silence turns into calls to your sales rep, bad reviews, and cancellations. Someone has to own the update cadence.",
  },
  {
    title: "Messy job status and CRM data",
    symptom: "No one knows the next step",
    body: "When records aren't kept current, no one knows what's stuck, done, or needs action. Decisions get made from incomplete information.",
  },
];

const services = [
  {
    Icon: FileText,
    title: "Quote & Proposal Building",
    desc: "Accurate quotes from your site survey data so your sales team keeps moving.",
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
    n: "1",
    title: "Tell us what is stuck",
    desc: "Send the jobs, tasks, or backlog that need attention. Takes two minutes.",
  },
  {
    n: "2",
    title: "We organize the work",
    desc: "We identify priorities, missing info, and next actions against your support block.",
  },
  {
    n: "3",
    title: "We move it forward",
    desc: "We follow up, update records, and keep jobs from sitting idle.",
  },
];

const plans = [
  {
    name: "Light Support",
    hours: "2 hrs / week",
    label: "For cleanup",
    labelColor: "text-stone-600 bg-stone-100 border-stone-200",
    best: "Small backlogs, occasional permit or utility follow-up, cleanup tasks.",
    items: ["1-2 stuck jobs per week", "Occasional follow-up calls", "CRM cleanup batches"],
    featured: false,
  },
  {
    name: "Core Support",
    hours: "5 hrs / week",
    label: "Most common",
    labelColor: "text-amber-800 bg-amber-50 border-amber-200",
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
    label: "For active pipelines",
    labelColor: "text-stone-600 bg-stone-100 border-stone-200",
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
    <div className="flex flex-col font-sans">

      {/* ── Hero ─────────────────────────────────────────────────────────── */}
      <section
        className="border-b relative overflow-hidden"
        style={{ background: "radial-gradient(ellipse 120% 60% at 60% -5%, #FFF0CC 0%, #ffffff 62%)" }}
      >
        <div aria-hidden className="pointer-events-none absolute -top-32 right-1/4 w-[30rem] h-[30rem] rounded-full bg-amber-200/20 blur-3xl" />
        <div aria-hidden className="pointer-events-none absolute top-1/2 -right-16 w-64 h-64 rounded-full bg-orange-100/25 blur-2xl" />

        <div className={cn("relative py-16 lg:py-24", marketingShell)}>
          <div className="grid grid-cols-1 gap-12 lg:grid-cols-[1fr_460px] lg:gap-14 items-start">

            {/* Left */}
            <div className="flex flex-col gap-6">
              <h1 className="font-heading text-[2.75rem] sm:text-[3.5rem] font-semibold tracking-[-0.03em] leading-[1.06] text-stone-950">
                Back-office solar support<br className="hidden sm:block" />
                when jobs get stuck.
              </h1>

              <p className="text-[0.9375rem] text-stone-600 leading-[1.75] max-w-[460px]">
                We help residential solar companies move permits, utility applications, customer updates, CRM cleanup, and job follow-up forward. You get extra back-office capacity without adding another full-time office role.
              </p>

              <div className="flex flex-wrap gap-3 pt-1">
                <Link
                  href="/request-help"
                  className={cn(
                    buttonVariants({ size: "lg" }),
                    "bg-amber-500 hover:bg-amber-600 text-white border-transparent focus-visible:ring-amber-300 shadow-[0_2px_12px_rgba(245,158,11,0.30)] motion-safe:transition-all motion-safe:duration-200 motion-safe:hover:-translate-y-0.5 hover:shadow-[0_4px_20px_rgba(245,158,11,0.40)]"
                  )}
                >
                  Request Solar Ops Support
                </Link>
                <Link
                  href="/how-it-works"
                  className={cn(
                    buttonVariants({ size: "lg", variant: "outline" }),
                    "border-stone-200 motion-safe:transition-all motion-safe:duration-200 motion-safe:hover:-translate-y-0.5 hover:border-stone-300 hover:bg-stone-50 hover:shadow-[0_2px_8px_rgba(15,23,42,0.07)]"
                  )}
                >
                  See How It Works
                </Link>
              </div>

              <p className="text-xs text-stone-500 border-l-[3px] border-amber-300 pl-3 leading-relaxed mt-1">
                Built for solar companies, not homeowners shopping for solar.
              </p>
            </div>

            {/* Right: What we take off your plate */}
            <div className="relative">
              <div aria-hidden className="pointer-events-none absolute -inset-3 rounded-2xl bg-amber-100/35 blur-2xl" />

              <div
                className={cn(
                  "relative overflow-hidden rounded-xl border border-stone-200 bg-white/90 backdrop-blur-sm",
                  "shadow-[0_8px_40px_rgba(15,23,42,0.08),0_2px_8px_rgba(15,23,42,0.05)] ring-1 ring-stone-100"
                )}
              >
                <div className="border-b border-stone-100 bg-gradient-to-b from-amber-50/90 to-stone-50/40 px-5 py-4">
                  <p className="font-heading text-sm font-semibold tracking-tight text-stone-900">
                    What we take off your plate
                  </p>
                  <p className="mt-1 text-xs text-stone-600 leading-relaxed">
                    Hands-on office work your team can delegate. No new software to buy or learn.
                  </p>
                </div>

                <ul className="divide-y divide-stone-100">
                  {takeOffYourPlate.map((row, i) => (
                    <li key={i} className="flex gap-3 px-5 py-3.5">
                      <span
                        className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-amber-400 ring-2 ring-amber-100"
                        aria-hidden
                      />
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-stone-900 leading-snug">{row.title}</p>
                        <p className="mt-0.5 text-xs text-stone-600 leading-relaxed">{row.line}</p>
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── Problem ──────────────────────────────────────────────────────── */}
      <section id="problem" className="border-b" style={{ background: "linear-gradient(180deg, #FAFAF8 0%, #F5F4F1 100%)" }}>
        <div className={cn("py-16 lg:py-20", marketingShell)}>
          <div className="max-w-2xl mb-10">
            <h2 className="font-heading text-[1.75rem] sm:text-[1.875rem] font-semibold tracking-[-0.025em] leading-snug text-stone-950">
              Solar jobs rarely get stuck in the field.<br className="hidden sm:block" />
              They get stuck between steps.
            </h2>
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            {problems.map((p, i) => (
              <div
                key={i}
                className={cn(
                  cardBase,
                  cardHover,
                  "p-5 border-l-[3px] border-l-amber-300"
                )}
              >
                <p className="text-[0.6875rem] font-semibold uppercase tracking-[0.08em] text-amber-800/90 mb-3">
                  {p.symptom}
                </p>
                <h3 className="font-heading text-sm font-semibold mb-2 text-stone-900 leading-snug">{p.title}</h3>
                <p className="text-sm text-stone-600 leading-relaxed">{p.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Services ─────────────────────────────────────────────────────── */}
      <section id="services" className="border-b bg-white">
        <div className={cn("py-16 lg:py-20", marketingShell)}>
          <div className="flex items-end justify-between gap-6 flex-wrap mb-10">
            <h2 className="font-heading text-[1.75rem] sm:text-[1.875rem] font-semibold tracking-[-0.025em] leading-snug max-w-md text-stone-950">
              Support for the work that keeps projects moving.
            </h2>
            <Link
              href="/services"
              className={cn(buttonVariants({ variant: "outline", size: "sm" }), "shrink-0 gap-1 border-stone-200")}
            >
              View all services
              <ChevronRight className="h-3.5 w-3.5" />
            </Link>
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {services.map(({ Icon, title, desc, example }, i) => (
              <div
                key={i}
                className={cn(
                  cardBase,
                  cardHover,
                  "group relative p-5 flex flex-col gap-4 border-t-[3px] border-t-amber-200/80"
                )}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="rounded-lg border border-stone-200 bg-stone-50 p-2 text-stone-700 motion-safe:transition-transform motion-safe:duration-200 group-hover:border-amber-200/60 group-hover:bg-amber-50/40">
                    <Icon className="h-4 w-4" strokeWidth={1.75} />
                  </div>
                  <span className={chipNeutral}>Back-office</span>
                </div>
                <div className="flex flex-col gap-1.5">
                  <h3 className="font-heading text-sm font-semibold leading-snug text-stone-900 group-hover:text-stone-950 transition-colors duration-200">
                    {title}
                  </h3>
                  <p className="text-sm text-stone-600 leading-relaxed">{desc}</p>
                </div>
                <div className="mt-auto pt-3 border-t border-stone-100">
                  <p className="text-[0.6875rem] font-mono text-stone-500 leading-relaxed">
                    Example: {example}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── How it works ─────────────────────────────────────────────────── */}
      <section id="how-it-works" className="border-b" style={{ background: "linear-gradient(180deg, #F5F4F1 0%, #F0EEE9 100%)" }}>
        <div className={cn("py-16 lg:py-20", marketingShell)}>
          <div className="mb-8 sm:mb-10">
            <h2 className="font-heading text-[1.75rem] sm:text-[1.875rem] font-semibold tracking-[-0.025em] text-stone-950">
              Simple support process.
            </h2>
            <p className="mt-2 max-w-xl text-sm text-stone-600 leading-relaxed">
              You send what is stuck. We line up priorities and follow through so work does not sit in limbo.
            </p>
          </div>

          <div className="rounded-2xl border border-stone-200/80 bg-white/70 p-6 sm:p-8 shadow-[0_1px_3px_rgba(15,23,42,0.04)]">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3 relative">
              <div
                aria-hidden
                className="hidden sm:block absolute top-[2.5rem] left-[calc(33.333%+0.5rem)] right-[calc(33.333%+0.5rem)] h-px bg-gradient-to-r from-stone-200 via-amber-200/50 to-stone-200 pointer-events-none"
              />

              {steps.map((step, i) => (
                <div key={i} className={cn(cardBase, cardHover, "p-6 flex flex-col gap-4 bg-white")}>
                  <div className="w-9 h-9 rounded-full bg-amber-50 border border-amber-200 flex items-center justify-center text-sm font-semibold text-amber-900 shrink-0 relative z-10">
                    {step.n}
                  </div>
                  <div>
                    <h3 className="font-heading text-sm font-semibold mb-1.5 leading-snug text-stone-900">{step.title}</h3>
                    <p className="text-sm text-stone-600 leading-relaxed">{step.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="mt-6">
            <Link
              href="/how-it-works"
              className={cn(
                buttonVariants({ variant: "outline", size: "sm" }),
                "border-stone-200 motion-safe:transition-all motion-safe:duration-200 motion-safe:hover:-translate-y-0.5 hover:border-stone-300 hover:bg-stone-50 hover:shadow-[0_2px_8px_rgba(15,23,42,0.07)]"
              )}
            >
              See The Full Process
            </Link>
          </div>
        </div>
      </section>

      {/* ── Pricing ──────────────────────────────────────────────────────── */}
      <section id="pricing" className="border-b bg-white">
        <div className={cn("py-16 lg:py-20", marketingShell)}>
          <div className="mb-10">
            <h2 className="font-heading text-[1.75rem] sm:text-[1.875rem] font-semibold tracking-[-0.025em] text-stone-950">
              Flexible support blocks.
            </h2>
            <p className="mt-2 text-[0.9375rem] text-stone-600">
              Reserve weekly ops capacity that fits your current volume.
            </p>
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            {plans.map((plan, i) => (
              <div
                key={i}
                className={cn(
                  "rounded-xl border p-6 flex flex-col gap-5 min-h-[420px]",
                  "motion-safe:transition-all motion-safe:duration-200 motion-safe:hover:-translate-y-1",
                  plan.featured
                    ? "border-amber-300/70 bg-gradient-to-b from-amber-50/60 to-white shadow-[0_4px_24px_rgba(245,158,11,0.10),0_1px_3px_rgba(245,158,11,0.05)] hover:shadow-[0_12px_40px_rgba(245,158,11,0.14),0_2px_8px_rgba(245,158,11,0.06)] hover:border-amber-300"
                    : "border-stone-200 bg-white shadow-[0_1px_3px_rgba(15,23,42,0.05),0_4px_16px_rgba(15,23,42,0.04)] hover:border-amber-200/60 hover:shadow-[0_8px_32px_rgba(15,23,42,0.10),0_2px_8px_rgba(15,23,42,0.05)]"
                )}
              >
                <div>
                  <span className={cn("inline-flex items-center text-[0.6875rem] font-semibold tracking-[0.06em] uppercase rounded-md px-2 py-0.5 border mb-3", plan.labelColor)}>
                    {plan.label}
                  </span>
                  <h3 className="font-heading font-semibold text-stone-900">{plan.name}</h3>
                  <p className={cn(
                    "text-[1.875rem] font-bold tracking-tight mt-1 tabular-nums leading-none",
                    plan.featured ? "text-amber-700" : "text-stone-900"
                  )}>
                    {plan.hours}
                  </p>
                  <p className="text-sm text-stone-600 mt-3 leading-relaxed">{plan.best}</p>
                </div>

                <ul className="flex flex-col gap-2.5 flex-1">
                  {plan.items.map((item, j) => (
                    <li key={j} className="flex items-start gap-2.5 text-sm text-stone-600">
                      <span className="mt-2 h-1 w-1 shrink-0 rounded-full bg-amber-400/80" aria-hidden />
                      {item}
                    </li>
                  ))}
                </ul>

                <Link
                  href="/request-help"
                  className={cn(
                    "w-full mt-auto motion-safe:transition-all motion-safe:duration-200 motion-safe:hover:-translate-y-0.5",
                    plan.featured
                      ? cn(buttonVariants({ size: "default" }), "bg-amber-500 hover:bg-amber-600 text-white border-transparent focus-visible:ring-amber-300 shadow-[0_2px_8px_rgba(245,158,11,0.22)] hover:shadow-[0_4px_14px_rgba(245,158,11,0.32)]")
                      : cn(buttonVariants({ variant: "outline" }), "border-stone-200 hover:border-stone-300 hover:bg-stone-50")
                  )}
                >
                  Request this block
                </Link>
              </div>
            ))}
          </div>

          <div className="mt-5 rounded-xl border border-stone-200 bg-stone-50/90 px-5 py-4 max-w-2xl shadow-[0_1px_3px_rgba(15,23,42,0.04)]">
            <p className="font-heading text-sm font-semibold mb-1.5 text-stone-900">About capacity-based support</p>
            <p className="text-sm text-stone-600 leading-relaxed">
              Support blocks reserve time each week, not unlimited hours. If the list is longer than your block, we start with what moves jobs the fastest. The rest can roll to the next week or go through overflow approval.
            </p>
          </div>
        </div>
      </section>

      {/* ── Final CTA ────────────────────────────────────────────────────── */}
      <section className="bg-zinc-950 relative overflow-hidden">
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0"
          style={{ background: "radial-gradient(ellipse 800px 600px at -5% 115%, rgba(245,158,11,0.12), transparent 65%)" }}
        />
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0"
          style={{ background: "radial-gradient(ellipse 500px 400px at 105% -10%, rgba(251,191,36,0.06), transparent 60%)" }}
        />

        <div className={cn("relative py-16 lg:py-20", marketingShell)}>
          <div className="grid grid-cols-1 gap-10 lg:grid-cols-[1fr_auto] lg:gap-20 items-start">

            <div className="max-w-md">
              <h2 className="font-heading text-[1.75rem] sm:text-[1.875rem] font-semibold tracking-[-0.025em] text-white leading-snug">
                Tell us where your operations are stuck.
              </h2>
              <p className="mt-3 text-[0.9375rem] text-zinc-400 leading-[1.7]">
                No long-term contracts. No hiring overhead. Just focused solar ops support when you need it.
              </p>
              <div className="mt-7">
                <Link
                  href="/request-help"
                  className={cn(
                    buttonVariants({ size: "lg" }),
                    "bg-amber-500 hover:bg-amber-600 text-white border-transparent focus-visible:ring-amber-400 shadow-[0_2px_16px_rgba(245,158,11,0.35)] motion-safe:transition-all motion-safe:duration-200 motion-safe:hover:-translate-y-0.5 hover:shadow-[0_4px_24px_rgba(245,158,11,0.50)]"
                  )}
                >
                  Request Solar Ops Support
                </Link>
              </div>
            </div>

            <div className="rounded-xl border border-zinc-700/60 bg-zinc-900/80 p-5 lg:min-w-[280px] shadow-[0_4px_24px_rgba(0,0,0,0.30)] backdrop-blur-sm">
              <p className="text-[0.6875rem] font-semibold tracking-[0.1em] uppercase text-zinc-500 mb-4">
                Common request reasons
              </p>
              <ul className="flex flex-col gap-3.5">
                {ctaItems.map((item, i) => (
                  <li key={i} className="flex items-start gap-2.5">
                    <span className="mt-2 h-1 w-1 shrink-0 rounded-full bg-amber-400/90" aria-hidden />
                    <span className="text-sm text-zinc-300 leading-snug">{item}</span>
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
