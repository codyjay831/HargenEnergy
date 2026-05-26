import type { Metadata } from "next";
import { RequestHelpForm } from "@/components/forms/RequestHelpForm";
import { cn } from "@/lib/utils";
import { PRODUCT_LANGUAGE } from "@/lib/product-language";
import { requestHelpMetadata } from "@/lib/marketing/metadata";
import { getPublicDiscoveryCatalog } from "@/lib/discovery-catalog";
import { getDiscoverySchedulingReadiness } from "@/lib/discovery-scheduling/scheduling-readiness";
import {
  marketingShell,
  marketingSectionY,
  marketingCardBase,
  marketingH1,
  marketingLead,
} from "@/components/marketing/marketing-styles";

export const metadata: Metadata = requestHelpMetadata;

const checklist = [
  "Permit or utility file went quiet",
  "Customer has not had a real update in days",
  "CRM stages do not match what crews are doing",
  "Proposal backlog is slowing sales",
];

export default async function RequestHelpPage() {
  const [catalog, schedulingReadiness] = await Promise.all([
    getPublicDiscoveryCatalog(),
    getDiscoverySchedulingReadiness(),
  ]);
  const schedulingEnabled = schedulingReadiness.ready;

  return (
    <div className="border-b border-stone-200/80">
      <section className={cn(marketingSectionY)}>
        <div className={cn(marketingShell)}>
          <div className="grid grid-cols-1 gap-10 lg:grid-cols-[1fr_280px] lg:gap-14">
            <div>
              <h1 className={marketingH1}>{PRODUCT_LANGUAGE.discoveryRequest.action}</h1>
              <p className={cn(marketingLead, "mt-4 max-w-xl")}>
                Tell us where you are stuck. We start with a discovery call and activation conversation, not a support ticket.
                {schedulingEnabled
                  ? " Submit your request, then choose a time for your discovery call."
                  : " Most companies hear back within one business day."}
              </p>
              <p className="mt-2 text-sm text-stone-500">Takes about 2 minutes.</p>
            </div>

            <aside className={cn(marketingCardBase, "h-fit p-5 lg:sticky lg:top-20")}>
              <p className="text-xs font-semibold uppercase tracking-wider text-stone-500">
                Common starting points
              </p>
              <ul className="mt-3 flex flex-col gap-2.5">
                {checklist.map((item) => (
                  <li key={item} className="flex items-start gap-2 text-sm text-stone-600">
                    <span className="mt-2 h-1 w-1 shrink-0 rounded-full bg-amber-400" aria-hidden />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
              <p className="mt-4 border-t border-stone-100 pt-3 text-xs text-stone-500 leading-relaxed">
                No long-term contract required to start. Pick a weekly block after we talk through volume.
              </p>
            </aside>
          </div>

          <div
            className={cn(
              marketingCardBase,
              "mx-auto mt-10 max-w-3xl p-6 shadow-[0_4px_24px_rgba(15,23,42,0.06)] md:p-10"
            )}
          >
            <RequestHelpForm catalog={catalog} />
          </div>

          <p className="mx-auto mt-10 max-w-3xl text-center text-sm text-stone-600 leading-relaxed">
            {schedulingEnabled
              ? "After you submit, you can pick a discovery call time right away. We read your request and come prepared for the conversation."
              : "We read your request, check capacity, and reply by email or phone. Start small if you want — scale hours when your pipeline changes."}
          </p>

        </div>
      </section>
    </div>
  );
}
