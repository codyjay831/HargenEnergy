import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { PRIMARY_CTA } from "@/lib/marketing/constants";
import {
  marketingBandWarm,
  marketingCardBase,
  marketingCardHover,
  marketingCardTitle,
  marketingH2,
  marketingLead,
  marketingSectionHeaderMb,
  marketingSectionIntro,
  marketingSectionY,
  marketingShell,
  marketingSymptomLabel,
} from "@/components/marketing/marketing-styles";
import { problems } from "./home-data";

export function HomeProblem() {
  return (
    <section id="problem" className={marketingBandWarm}>
      <div className={cn(marketingSectionY, marketingShell)}>
        <div className={cn(marketingSectionIntro, marketingSectionHeaderMb)}>
          <h2 className={cn(marketingH2, "leading-snug")}>
            Field work keeps moving.
            <br className="hidden sm:block" />
            Between steps is where timelines extend.
          </h2>
          <p className={cn(marketingLead, "mt-3")}>
            Permits, utilities, customer updates, and CRM hygiene are where residential
            solar pipelines slow down. That is the work we take on.
          </p>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          {problems.map((p) => (
            <div
              key={p.title}
              className={cn(
                marketingCardBase,
                marketingCardHover,
                "p-5 border-l-[3px] border-l-amber-300"
              )}
            >
              <p className={marketingSymptomLabel}>{p.symptom}</p>
              <h3 className={cn(marketingCardTitle, "mb-2")}>{p.title}</h3>
              <p className="text-sm text-stone-600 leading-relaxed">{p.body}</p>
            </div>
          ))}
        </div>

        <div className="mt-10 flex flex-col sm:flex-row sm:items-center gap-4">
          <p className="text-sm text-stone-600">
            Recognize the pattern? Tell us where your pipeline needs attention.
          </p>
          <Link
            href="/request-help"
            className={cn(buttonVariants({ variant: "outline", size: "sm" }), "border-stone-200 shrink-0")}
          >
            {PRIMARY_CTA}
          </Link>
        </div>
      </div>
    </section>
  );
}
