import type { Metadata } from "next";
import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { PRIMARY_CTA } from "@/lib/marketing/constants";
import { pricingMetadata } from "@/lib/marketing/metadata";
import { capacityNote } from "@/lib/marketing/plans";
import {
  marketingShell,
  marketingSectionY,
  marketingH1,
  marketingH2,
  marketingLead,
} from "@/components/marketing/marketing-styles";

export const metadata: Metadata = pricingMetadata;

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
          <h1 className={marketingH1}>Prepaid weekly operations support</h1>
          <p className={cn(marketingLead, "mx-auto mt-4 max-w-2xl")}>
            Choose the weekly hours that fit your workload. Scope and rate are confirmed
            during discovery and can be adjusted as your volume changes.
          </p>
        </div>
      </section>

      <section className={cn(marketingSectionY, "border-b border-stone-200/80 bg-white")}>
        <div className={marketingShell}>
          <div className="rounded-xl border border-stone-200 bg-white p-6 md:p-8">
            <h2 className={cn(marketingH2, "text-xl")}>Pick your prepaid weekly hours</h2>
            <p className="mt-2 text-sm text-stone-600 leading-relaxed">
              We set a prepaid block based on your real workload, not rigid tiers. Many teams
              start around 5 hours/week and increase as trust and volume grow.
            </p>
            <ul className="mt-4 list-disc pl-5 text-sm text-stone-700 space-y-1">
              <li>Monthly prepaid billing for reserved weekly capacity</li>
              <li>Adjust hours up or down as your pipeline changes</li>
              <li>Occasional overflow can be approved and invoiced separately</li>
            </ul>
          </div>

          <div className="mt-10 max-w-2xl rounded-xl border border-stone-200 bg-stone-50/90 px-5 py-4 shadow-[0_1px_3px_rgba(15,23,42,0.04)]">
            <p className="font-heading text-sm font-semibold text-stone-900">
              {capacityNote.title}
            </p>
            <p className="mt-2 text-sm text-stone-600 leading-relaxed">{capacityNote.body}</p>
          </div>

          <div className="mt-8 grid grid-cols-1 gap-6 rounded-xl border border-stone-200 bg-white p-6 md:grid-cols-2 md:p-8">
            <div>
              <h2 className={cn(marketingH2, "text-xl")}>Overflow and custom scope</h2>
              <p className="mt-2 text-sm text-stone-600 leading-relaxed">
                Existing clients can request overflow hours when a week runs hot. Larger
                teams sometimes need a custom arrangement. Ask when you submit a request.
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
                {PRIMARY_CTA}
              </Link>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
