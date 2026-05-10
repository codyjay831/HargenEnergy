import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  marketingShell,
  marketingSectionY,
  marketingH1,
  marketingH2,
  marketingLead,
  marketingAmberCta,
} from "@/components/marketing/marketing-styles";

const plans = [
  {
    name: "Light Support",
    hours: "2 hours per week",
    label: "For cleanup",
    labelClass: "text-stone-600 bg-stone-100 border-stone-200",
    description: "Small backlogs, a few stuck jobs, or occasional permit and utility follow-up.",
    items: [
      "1-2 stuck jobs per week",
      "Occasional follow-up calls",
      "CRM cleanup batches",
      "Weekly capacity reserved in advance",
    ],
    featured: false,
  },
  {
    name: "Core Support",
    hours: "5 hours per week",
    label: "Most common",
    labelClass: "text-amber-800 bg-amber-50 border-amber-200",
    description: "Steady weekly help for companies with active pipelines and regular paperwork.",
    items: [
      "Ongoing permit and utility tracking",
      "Customer communication on schedule",
      "CRM updates and job status hygiene",
      "Quote and proposal support as needed",
    ],
    featured: true,
  },
  {
    name: "Priority Support",
    hours: "10 hours per week",
    label: "For active pipelines",
    labelClass: "text-stone-600 bg-stone-100 border-stone-200",
    description: "Multiple crews and jobs moving at once. More room for daily follow-up and deeper cleanup.",
    items: [
      "Multiple job pipelines at once",
      "More time for calls and resubmittals",
      "Stuck job resolution across stages",
      "Enphase and equipment setup support",
    ],
    featured: false,
  },
];

export default function PricingPage() {
  return (
    <div>
      <section
        className={cn("border-b border-stone-200/80", marketingSectionY)}
        style={{
          background:
            "radial-gradient(ellipse 100% 50% at 50% -15%, #FFF0CC 0%, #ffffff 58%)",
        }}
      >
        <div className={cn(marketingShell, "text-center")}>
          <h1 className={marketingH1}>Weekly support blocks</h1>
          <p className={cn(marketingLead, "mx-auto mt-4 max-w-2xl")}>
            Simple capacity pricing. Pick the hours that match your volume. Adjust when things change.
          </p>
        </div>
      </section>

      <section className={cn(marketingSectionY, "border-b border-stone-200/80 bg-white")}>
        <div className={cn(marketingShell)}>
          <div className="grid grid-cols-1 gap-5 md:grid-cols-3">
            {plans.map((plan, i) => (
              <div
                key={i}
                className={cn(
                  "flex min-h-[440px] flex-col rounded-xl border p-6 md:p-7",
                  "motion-safe:transition-all motion-safe:duration-200 motion-safe:hover:-translate-y-1",
                  plan.featured
                    ? "border-amber-300/70 bg-gradient-to-b from-amber-50/60 to-white shadow-[0_4px_24px_rgba(245,158,11,0.10),0_1px_3px_rgba(245,158,11,0.05)] hover:border-amber-300 hover:shadow-[0_12px_40px_rgba(245,158,11,0.14)]"
                    : "border-stone-200 bg-white shadow-[0_1px_3px_rgba(15,23,42,0.05),0_4px_16px_rgba(15,23,42,0.04)] hover:border-amber-200/60 hover:shadow-[0_8px_28px_rgba(15,23,42,0.08)]"
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
                  <h2 className="font-heading text-lg font-semibold text-stone-900">{plan.name}</h2>
                  <p
                    className={cn(
                      "mt-2 text-[1.875rem] font-bold tabular-nums leading-none tracking-tight",
                      plan.featured ? "text-amber-700" : "text-stone-900"
                    )}
                  >
                    {plan.hours}
                  </p>
                  <p className="mt-3 text-sm text-stone-600 leading-relaxed">{plan.description}</p>
                </div>

                <ul className="mt-6 flex flex-1 flex-col gap-2.5">
                  {plan.items.map((item, j) => (
                    <li key={j} className="flex items-start gap-2.5 text-sm text-stone-600">
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
                    "mt-8 w-full",
                    plan.featured
                      ? cn(buttonVariants({ size: "default" }), marketingAmberCta)
                      : cn(
                          buttonVariants({ variant: "outline", size: "default" }),
                          "border-stone-200 hover:border-stone-300 hover:bg-stone-50"
                        )
                  )}
                >
                  Request this block
                </Link>
              </div>
            ))}
          </div>

          <div
            className={cn(
              "mt-10 max-w-2xl rounded-xl border border-stone-200 bg-stone-50/90 px-5 py-4 shadow-[0_1px_3px_rgba(15,23,42,0.04)]"
            )}
          >
            <p className="font-heading text-sm font-semibold text-stone-900">How capacity works</p>
            <p className="mt-2 text-sm text-stone-600 leading-relaxed">
              Blocks reserve time each week, not unlimited hours. If work exceeds your block, we prioritize what moves revenue and schedules first. Remaining items can roll to the next week or be approved as overflow.
            </p>
          </div>

          <div
            className={cn(
              "mt-8 grid grid-cols-1 gap-6 rounded-xl border border-stone-200 bg-white p-6 md:grid-cols-2 md:p-8"
            )}
          >
            <div>
              <h2 className={cn(marketingH2, "text-xl")}>Overflow and custom scope</h2>
              <p className="mt-2 text-sm text-stone-600 leading-relaxed">
                Existing clients can request overflow hours when a week runs hot. Larger teams sometimes need a custom arrangement. Ask when you submit a request.
              </p>
            </div>
            <div className="flex flex-col justify-center gap-3">
              <p className="text-sm text-stone-600">
                We limit how many companies we onboard at once so turnaround stays honest.
              </p>
              <Link
                href="/request-help"
                className={cn(
                  buttonVariants({ variant: "outline" }),
                  "w-full border-stone-200 hover:bg-stone-50"
                )}
              >
                Check availability
              </Link>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
