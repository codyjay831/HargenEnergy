import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { PRIMARY_CTA } from "@/lib/marketing/constants";
import { type SupportPlan } from "@/lib/marketing/plans";
import { marketingAmberCta } from "@/components/marketing/marketing-styles";

type PricingCardsProps = {
  plans: SupportPlan[];
  compact?: boolean;
};

export function PricingCards({ plans, compact = false }: PricingCardsProps) {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-3 sm:gap-5">
      {plans.map((plan) => (
        <div
          key={plan.id}
          className={cn(
            "flex flex-col rounded-xl border p-6",
            compact ? "gap-5 min-h-[420px]" : "min-h-[440px] md:p-7",
            "motion-safe:transition-all motion-safe:duration-200 motion-safe:hover:-translate-y-1",
            plan.featured
              ? "border-amber-300/70 bg-gradient-to-b from-amber-50/60 to-white shadow-[0_4px_24px_rgba(245,158,11,0.10),0_1px_3px_rgba(245,158,11,0.05)] hover:border-amber-300 hover:shadow-[0_12px_40px_rgba(245,158,11,0.14),0_2px_8px_rgba(245,158,11,0.06)]"
              : "border-stone-200 bg-white shadow-[0_1px_3px_rgba(15,23,42,0.05),0_4px_16px_rgba(15,23,42,0.04)] hover:border-amber-200/60 hover:shadow-[0_8px_32px_rgba(15,23,42,0.10),0_2px_8px_rgba(15,23,42,0.05)]"
          )}
        >
          <div>
            <span
              className={cn(
                "mb-3 inline-flex rounded-md border px-2 py-0.5 text-[0.6875rem] font-semibold uppercase tracking-[0.06em]",
                plan.labelClass
              )}
            >
              {plan.label}
            </span>
            <h3 className="font-heading text-lg font-semibold text-stone-900">{plan.name}</h3>
            <p
              className={cn(
                "mt-1 text-[1.875rem] font-bold tabular-nums leading-none tracking-tight",
                plan.featured ? "text-amber-700" : "text-stone-900"
              )}
            >
              {plan.hours}
            </p>
            <p className="mt-3 text-sm text-stone-600 leading-relaxed">{plan.description}</p>
          </div>

          <ul className={cn("flex flex-1 flex-col gap-2.5", compact ? "mt-0" : "mt-6")}>
            {plan.items.map((item) => (
              <li key={item} className="flex items-start gap-2.5 text-sm text-stone-600">
                <span
                  className={cn(
                    "mt-2 h-1 w-1 shrink-0 rounded-full",
                    plan.featured ? "bg-amber-400" : "bg-stone-300"
                  )}
                  aria-hidden
                />
                {item}
              </li>
            ))}
          </ul>

          <Link
            href="/request-help"
            className={cn(
              "mt-auto w-full motion-safe:transition-all motion-safe:duration-200 motion-safe:hover:-translate-y-0.5",
              compact ? "mt-0" : "mt-8",
              plan.featured
                ? cn(buttonVariants({ size: "default" }), marketingAmberCta)
                : cn(
                    buttonVariants({ variant: "outline", size: "default" }),
                    "border-stone-200 hover:border-stone-300 hover:bg-stone-50"
                  )
            )}
          >
            {PRIMARY_CTA}
          </Link>
        </div>
      ))}
    </div>
  );
}
