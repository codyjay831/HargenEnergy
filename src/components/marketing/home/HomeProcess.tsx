import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  marketingBandProcess,
  marketingCardBase,
  marketingCardHover,
  marketingCardTitle,
  marketingH2,
  marketingLead,
  marketingSectionHeaderMb,
  marketingSectionIntro,
  marketingSectionY,
  marketingShell,
} from "@/components/marketing/marketing-styles";
import { steps } from "./home-data";

export function HomeProcess() {
  return (
    <section id="how-it-works" className={marketingBandProcess}>
      <div className={cn(marketingSectionY, marketingShell)}>
        <div className={cn(marketingSectionIntro, marketingSectionHeaderMb)}>
          <h2 className={marketingH2}>Simple support process.</h2>
          <p className={cn(marketingLead, "mt-3")}>
            You send what is stuck. We line up priorities and follow through so permit,
            utility, and customer work does not sit in limbo.
          </p>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          {steps.map((step) => (
            <div
              key={step.n}
              className={cn(marketingCardBase, marketingCardHover, "p-6 flex flex-col gap-4 bg-white")}
            >
              <div className="w-9 h-9 rounded-full bg-amber-50 border border-amber-200 flex items-center justify-center text-sm font-semibold text-amber-900 shrink-0">
                {step.n}
              </div>
              <div>
                <h3 className={cn(marketingCardTitle, "mb-1.5")}>{step.title}</h3>
                <p className="text-sm text-stone-600 leading-relaxed">{step.desc}</p>
              </div>
            </div>
          ))}
        </div>

        <div className="mt-8 flex flex-wrap gap-3">
          <Link
            href="/how-it-works"
            className={cn(
              buttonVariants({ variant: "outline", size: "sm" }),
              "border-stone-200 motion-safe:transition-all motion-safe:duration-200 motion-safe:hover:-translate-y-0.5 hover:border-stone-300 hover:bg-stone-50"
            )}
          >
            See the full process
          </Link>
          <Link
            href="/request-help"
            className={cn(buttonVariants({ variant: "ghost", size: "sm" }), "text-stone-700")}
          >
            Start with a walkthrough →
          </Link>
        </div>
      </div>
    </section>
  );
}
