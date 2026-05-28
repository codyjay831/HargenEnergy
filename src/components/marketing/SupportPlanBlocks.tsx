import { cn } from "@/lib/utils";
import { type SupportPlan } from "@/lib/marketing/plans";

type SupportPlanBlocksProps = {
  plans: SupportPlan[];
  className?: string;
};

export function SupportPlanBlocks({ plans, className }: SupportPlanBlocksProps) {
  return (
    <div className={cn("grid grid-cols-1 gap-4 sm:grid-cols-3", className)}>
      {plans.map((plan) => (
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
          <p className="mt-2 text-sm text-stone-600 leading-relaxed">{plan.description}</p>
        </div>
      ))}
    </div>
  );
}
