import type { Metadata } from "next";
import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { PRIMARY_CTA } from "@/lib/marketing/constants";
import { aboutMetadata } from "@/lib/marketing/metadata";
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

export const metadata: Metadata = aboutMetadata;

export default function AboutPage() {
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
            <h1 className={marketingH1}>About Hargen Energy</h1>
            <p className={cn(marketingLead, "mt-4")}>
              Solar operations support for residential contractors. Real people doing permit follow-up, utility paperwork, customer updates, CRM cleanup, and the jobs that stall between install milestones.{" "}
              <Link href="/services" className="font-medium text-stone-900 underline-offset-4 hover:underline">
                Explore services
              </Link>{" "}
              or{" "}
              <Link href="/how-it-works" className="font-medium text-stone-900 underline-offset-4 hover:underline">
                see how onboarding works
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
        <div className={cn(marketingShell, "grid grid-cols-1 gap-10 lg:grid-cols-[1fr_380px] lg:gap-14")}>
          <div className="space-y-5 text-[0.9375rem] leading-relaxed text-stone-700">
            <p>
              Hargen Energy LLC started from a simple pattern we kept seeing: strong sales and install teams, with a back office that could not keep up on permits, utilities, and homeowner communication.
            </p>
            <p>
              That gap shows up as stuck jobs, angry homeowners, and slow cash. A lot of shops do not need another full-time ops salary on day one. They need steady hands on the paperwork a few hours a week, done by people who know solar workflows.
            </p>
            <p>
              That is the work we take on. We are not a generic virtual assistant marketplace. We focus on solar back-office execution: portals, AHJs, interconnection, CRM hygiene, and clear customer updates.
            </p>
            <h2 className={cn(marketingH2, "pt-2 text-xl sm:text-[1.35rem]")}>How we work with you</h2>
            <p>
              Straight talk, clear priorities, and weekly capacity you can plan around. No hype about automation replacing judgment. When something is out of scope, we say so early.
            </p>
          </div>

          <div className="flex flex-col gap-6">
            <div className={cn(marketingCardBase, marketingCardHover, "p-6")}>
              <h3 className="font-heading text-sm font-semibold uppercase tracking-wide text-stone-900">
                What we are
              </h3>
              <ul className="mt-3 space-y-2.5 text-sm text-stone-600">
                {[
                  "Solar operations desk for contractors",
                  "Flexible prepaid weekly hours",
                  "US-based work on your systems and tools",
                ].map((line) => (
                  <li key={line} className="flex items-start gap-2.5">
                    <span className="mt-2 h-1 w-1 shrink-0 rounded-full bg-amber-400" aria-hidden />
                    <span>{line}</span>
                  </li>
                ))}
              </ul>
            </div>

            <div className={cn(marketingCardBase, marketingCardHover, "p-6")}>
              <h3 className="font-heading text-sm font-semibold uppercase tracking-wide text-stone-900">
                What we are not
              </h3>
              <ul className="mt-3 space-y-2.5 text-sm text-stone-600">
                {[
                  "Not a homeowner installer or sales org",
                  "Not a generic VA gig platform",
                  "Not a software product you have to adopt",
                ].map((line) => (
                  <li key={line} className="flex items-start gap-2.5">
                    <span className="mt-2 h-1 w-1 shrink-0 rounded-full bg-stone-300" aria-hidden />
                    <span>{line}</span>
                  </li>
                ))}
              </ul>
            </div>

            <div className="rounded-lg border border-stone-200 bg-white/80 px-4 py-3 text-xs text-stone-500">
              Based in the United States, supporting residential solar companies nationwide.
            </div>

            <Link
              href="/request-help"
              className={cn(buttonVariants({ size: "lg" }), marketingAmberCta, "w-full text-center")}
            >
              {PRIMARY_CTA}
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
