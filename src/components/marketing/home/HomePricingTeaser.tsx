import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { PRIMARY_CTA } from "@/lib/marketing/constants";
import { supportPlans } from "@/lib/marketing/plans";
import {
  marketingAmberCta,
  marketingBandWarm,
  marketingH2,
  marketingLead,
  marketingSectionHeaderMb,
  marketingSectionIntro,
  marketingSectionY,
  marketingShell,
} from "@/components/marketing/marketing-styles";

export function HomePricingTeaser() {
  return (
    <section id="pricing" className={marketingBandWarm}>
      <div className={cn(marketingSectionY, marketingShell)}>
        <div className={cn(marketingSectionIntro, marketingSectionHeaderMb)}>
          <h2 className={marketingH2}>Flexible support blocks.</h2>
          <p className={cn(marketingLead, "mt-3")}>
            Reserve weekly solar operations capacity that fits your current volume.
            Weekly blocks; scope and rate confirmed on your walkthrough.
          </p>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3 mb-8">
          {supportPlans.map((plan) => (
            <div
              key={plan.id}
              className={cn(
                "rounded-xl border p-5",
                plan.featured
                  ? "border-amber-300/70 bg-gradient-to-b from-amber-50/60 to-white shadow-[0_2px_12px_rgba(245,158,11,0.08)]"
                  : "border-stone-200 bg-white"
              )}
            >
              <span
                className={cn(
                  "inline-flex rounded-md border px-2 py-0.5 text-[0.6875rem] font-semibold uppercase tracking-[0.06em]",
                  plan.labelClass
                )}
              >
                {plan.label}
              </span>
              <h3 className="mt-3 font-heading font-semibold text-stone-900">{plan.name}</h3>
              <p
                className={cn(
                  "mt-1 text-xl font-bold tabular-nums tracking-tight",
                  plan.featured ? "text-amber-700" : "text-stone-900"
                )}
              >
                {plan.hours}
              </p>
            </div>
          ))}
        </div>

        <div className="flex flex-col sm:flex-row gap-3">
          <Link
            href="/pricing"
            className={cn(
              buttonVariants({ variant: "outline", size: "lg" }),
              "gap-1.5 border-stone-200 justify-center sm:justify-start"
            )}
          >
            View pricing blocks
            <ChevronRight className="h-4 w-4" aria-hidden />
          </Link>
          <Link
            href="/request-help"
            className={cn(buttonVariants({ size: "lg" }), marketingAmberCta, "justify-center sm:justify-start")}
          >
            {PRIMARY_CTA}
          </Link>
        </div>
      </div>
    </section>
  );
}
