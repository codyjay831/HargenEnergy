import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { AUDIENCE_NOTE, PRIMARY_CTA, TRUST_BULLETS } from "@/lib/marketing/constants";
import {
  marketingAmberCta,
  marketingCaption,
  marketingH1,
  marketingLead,
  marketingShell,
} from "@/components/marketing/marketing-styles";
import { takeOffYourPlate } from "./home-data";

export function HomeHero() {
  return (
    <section
      className="border-b relative overflow-hidden"
      style={{
        background:
          "radial-gradient(ellipse 120% 60% at 60% -5%, #FFF0CC 0%, #ffffff 62%)",
      }}
    >
      <div
        aria-hidden
        className="pointer-events-none absolute -top-32 right-1/4 w-[30rem] h-[30rem] rounded-full bg-amber-200/20 blur-3xl"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute top-1/2 -right-16 w-64 h-64 rounded-full bg-orange-100/25 blur-2xl"
      />

      <div className={cn("relative py-14 lg:py-20", marketingShell)}>
        <div className="grid grid-cols-1 gap-10 lg:grid-cols-[1fr_420px] lg:gap-12 items-start">
          <div className="flex flex-col gap-5">
            <h1 className={marketingH1}>
              Back-office solar support
              <br className="hidden sm:block" />
              when jobs get stuck.
            </h1>

            <p className={cn(marketingLead, "max-w-[480px]")}>
              We help residential solar companies move permits, utility applications,
              customer updates, CRM cleanup, and job follow-up forward. Add back-office
              capacity without another full-time office hire.
            </p>

            <ul className="flex flex-wrap gap-x-4 gap-y-1.5">
              {TRUST_BULLETS.map((item) => (
                <li key={item} className="flex items-center gap-1.5 text-sm text-stone-600">
                  <span className="h-1 w-1 shrink-0 rounded-full bg-amber-400" aria-hidden />
                  {item}
                </li>
              ))}
            </ul>

            <div className="flex flex-col sm:flex-row gap-3 pt-1">
              <Link
                href="/request-help"
                className={cn(
                  buttonVariants({ size: "lg" }),
                  marketingAmberCta,
                  "w-full sm:w-auto justify-center"
                )}
              >
                {PRIMARY_CTA}
              </Link>
              <Link
                href="/how-it-works"
                className={cn(
                  buttonVariants({ size: "lg", variant: "outline" }),
                  "w-full sm:w-auto justify-center border-stone-200 motion-safe:transition-all motion-safe:duration-200 motion-safe:hover:-translate-y-0.5 hover:border-stone-300 hover:bg-stone-50"
                )}
              >
                See how it works
              </Link>
            </div>

            <p className={cn(marketingCaption, "border-l-[3px] border-amber-300 pl-3 mt-1")}>
              {AUDIENCE_NOTE}
            </p>

            <p className="text-sm text-stone-600">
              Need capacity details first?{" "}
              <Link href="/pricing" className="font-medium text-stone-900 underline-offset-4 hover:underline">
                View weekly support blocks
              </Link>
            </p>
          </div>

          <div className="relative">
            <div
              aria-hidden
              className="pointer-events-none absolute -inset-3 rounded-2xl bg-amber-100/35 blur-2xl"
            />

            <div
              className={cn(
                "relative overflow-hidden rounded-xl border border-stone-200 bg-white/90 backdrop-blur-sm",
                "shadow-[0_8px_40px_rgba(15,23,42,0.08),0_2px_8px_rgba(15,23,42,0.05)] ring-1 ring-stone-100"
              )}
            >
              <div className="border-b border-stone-100 bg-gradient-to-b from-amber-50/90 to-stone-50/40 px-5 py-4">
                <p className="font-heading text-base font-semibold tracking-tight text-stone-900">
                  What we take off your plate
                </p>
                <p className={cn(marketingCaption, "mt-1")}>
                  Hands-on office work your team can delegate. No new software to buy or learn.
                </p>
              </div>

              <ul className="divide-y divide-stone-100">
                {takeOffYourPlate.map((row) => (
                  <li key={row.title} className="flex gap-3 px-5 py-3.5">
                    <span
                      className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-amber-400 ring-2 ring-amber-100"
                      aria-hidden
                    />
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-stone-900 leading-snug">
                        {row.title}
                      </p>
                      <p className={cn(marketingCaption, "mt-0.5")}>{row.line}</p>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
