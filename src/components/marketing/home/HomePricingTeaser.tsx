import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { PRIMARY_CTA } from "@/lib/marketing/constants";
import {
  marketingAmberCta,
  marketingBandWarm,
  marketingCaption,
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
          <h2 className={marketingH2}>Flexible operations support based on your workload.</h2>
          <p className={cn(marketingLead, "mt-3")}>
            Not every solar company needs another full-time hire. Hargen Energy offers
            prepaid weekly hours based on how much project follow-up, coordination, and
            cleanup your team needs right now.
          </p>
        </div>
        <div className="mb-8 rounded-xl border border-stone-200 bg-white p-5 text-sm text-stone-700">
          Start with the hours you need today, then increase or decrease over time. Overflow
          can be approved case-by-case and invoiced separately.
        </div>

        <div className="flex flex-col sm:flex-row gap-3">
          <Link
            href="/pricing"
            className={cn(
              buttonVariants({ variant: "outline", size: "lg" }),
              "gap-1.5 border-stone-200 justify-center sm:justify-start"
            )}
          >
            View support options
            <ChevronRight className="h-4 w-4" aria-hidden />
          </Link>
          <Link
            href="/request-help"
            className={cn(buttonVariants({ size: "lg" }), marketingAmberCta, "justify-center sm:justify-start")}
          >
            {PRIMARY_CTA}
          </Link>
        </div>

        <p className={cn(marketingCaption, "mt-4 leading-snug")}>
          No long-term contract to start.
        </p>
      </div>
    </section>
  );
}
