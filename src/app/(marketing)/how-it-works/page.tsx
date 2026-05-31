import type { Metadata } from "next";
import Link from "next/link";
import { Search, Layers, BarChart2, Eye, RefreshCw } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { PRIMARY_CTA } from "@/lib/marketing/constants";
import { howItWorksMetadata } from "@/lib/marketing/metadata";
import {
  marketingShell,
  marketingSectionY,
  marketingCardBase,
  marketingCardHover,
  marketingH1,
  marketingH2,
  marketingLead,
  marketingAmberCta,
} from "@/components/marketing/marketing-styles";

export const metadata: Metadata = howItWorksMetadata;

const steps = [
  {
    title: "Tell us where you need support",
    icon: Search,
    description:
      "Send a request with your bottlenecks. Utility pile, messy CRM, permits going quiet. We read it like a handoff, not a sales form.",
  },
  {
    title: "Choose your weekly hours",
    icon: Layers,
    description:
      "Pick the prepaid weekly hours that fit your workload. No long-term contract. When volume shifts, we adjust with you.",
  },
  {
    title: "We start with what moves jobs",
    icon: BarChart2,
    description:
      "We order work by impact. If one stage is blocking cash or crews, that is usually where we dig in first.",
  },
  {
    title: "Work stays visible",
    icon: Eye,
    description:
      "After onboarding, you get a private portal for open work and weekly time. No guessing whether something is in progress.",
  },
  {
    title: "Review and reset priorities",
    icon: RefreshCw,
    description:
      "As backlog clears, we line up the next batch with you. The point is steady forward motion, not a one-off burst.",
  },
];

export default function HowItWorksPage() {
  return (
    <div>
      <section
        className={cn("border-b border-stone-200/80 bg-white", marketingSectionY)}
        style={{
          background:
            "radial-gradient(ellipse 100% 50% at 50% -15%, #FFF0CC 0%, #ffffff 58%)",
        }}
      >
        <div className={cn(marketingShell)}>
          <div className="max-w-2xl">
            <h1 className={marketingH1}>How solar operations support works</h1>
            <p className={cn(marketingLead, "mt-4")}>
              Built to be easy to start and easy to run. You do not learn new software to get help. You send work, we execute, you see status.{" "}
              <Link href="/pricing" className="font-medium text-stone-900 underline-offset-4 hover:underline">
                View support options
              </Link>{" "}
              or{" "}
              <Link href="/services" className="font-medium text-stone-900 underline-offset-4 hover:underline">
                browse services
              </Link>
              .
            </p>
          </div>
        </div>
      </section>

      <section
        className={cn(
          marketingSectionY,
          "border-b border-stone-200/80 bg-[linear-gradient(180deg,#FAFAF8_0%,#F5F4F1_100%)]"
        )}
      >
        <div className={cn(marketingShell)}>
          <div className="space-y-5">
            {steps.map((step, i) => (
              <div
                key={i}
                className={cn(
                  marketingCardBase,
                  marketingCardHover,
                  "flex flex-col gap-4 p-6 sm:flex-row sm:items-start sm:gap-6 md:p-7"
                )}
              >
                <div className="flex shrink-0 items-center gap-3 sm:flex-col sm:items-start">
                  <div className="flex h-11 w-11 items-center justify-center rounded-full border border-amber-200 bg-amber-50 text-sm font-semibold text-amber-900">
                    {i + 1}
                  </div>
                  <step.icon className="h-5 w-5 text-amber-800/80 sm:ml-2" strokeWidth={1.75} />
                </div>
                <div className="min-w-0 flex-1">
                  <h2 className="font-heading text-lg font-semibold tracking-tight text-stone-900 sm:text-xl">
                    {step.title}
                  </h2>
                  <p className="mt-2 text-sm text-stone-600 leading-relaxed sm:text-[0.9375rem]">
                    {step.description}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className={cn(marketingSectionY, "border-b border-stone-200/80 bg-white")}>
        <div className={cn(marketingShell)}>
          <div className="grid grid-cols-1 gap-8 lg:grid-cols-2 lg:items-stretch">
            <div className={cn(marketingCardBase, "p-6 md:p-8")}>
              <h2 className={marketingH2}>Capacity-based support</h2>
              <p className="mt-3 text-sm text-stone-600 leading-relaxed">
                You reserve weekly operations capacity in prepaid hours, not unlimited help. If the list is longer than your reserved hours allow, we start with what moves jobs the fastest. The rest can roll forward or go through overflow approval.
              </p>
              <p className="mt-4 border-l-2 border-amber-200 pl-3 text-sm italic text-stone-600 leading-relaxed">
                Clients choose weekly hours based on workload, not unlimited help. If requested work exceeds available hours, we prioritize the highest-impact items first.
              </p>
            </div>
            <div className="flex flex-col justify-between rounded-xl border border-stone-800 bg-zinc-950 p-6 text-white shadow-[0_8px_40px_rgba(0,0,0,0.12)] md:p-8">
              <div>
                <h3 className="font-heading text-lg font-semibold text-white">Ready to start?</h3>
                <p className="mt-2 text-sm text-zinc-400 leading-relaxed">
                  Share your backlog. We will reply with next steps and the right prepaid weekly hours for your workload.
                </p>
              </div>
              <Link
                href="/request-help"
                className={cn(buttonVariants({ size: "lg" }), marketingAmberCta, "mt-8 w-full sm:mt-6")}
              >
                {PRIMARY_CTA}
              </Link>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
