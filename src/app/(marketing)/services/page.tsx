import type { Metadata } from "next";
import Link from "next/link";
import {
  FileText,
  Calendar,
  MessageSquare,
  ClipboardCheck,
  Settings,
  Database,
  ArrowRight,
} from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { PRIMARY_CTA } from "@/lib/marketing/constants";
import { servicesMetadata } from "@/lib/marketing/metadata";
import {
  marketingShell,
  marketingSectionY,
  marketingCardBase,
  marketingCardHover,
  marketingH1,
  marketingH2,
  marketingLead,
  marketingAmberCta,
} from "@/components/marketing/marketing-styles";

export const metadata: Metadata = servicesMetadata;

const services = [
  {
    title: "Quote and proposal support",
    icon: FileText,
    description:
      "We build quotes and proposals in the office so your reps can stay in the field. Aurora, Solo, or the tools you already use.",
    items: [
      "Proposals in your design tool of choice",
      "Initial layout drafts from survey notes",
      "Price sheet checks before send",
      "Financing packet prep when you need it",
    ],
  },
  {
    title: "Scheduling and job coordination",
    icon: Calendar,
    description:
      "Crews and inspections only work if someone owns the calendar. We handle the phone tag and the back-and-forth with jurisdictions.",
    items: [
      "Site assessment scheduling",
      "Install crew coordination",
      "Inspection scheduling with AHJs",
      "Service call coordination",
    ],
  },
  {
    title: "Customer communication",
    icon: MessageSquare,
    description:
      "Homeowners call less when they get clear updates. We write and send professional status notes on your timeline.",
    items: [
      "Weekly or milestone project updates",
      "Post-install check-ins",
      "Chasing missing homeowner documents",
      "Basic inbound project questions",
    ],
  },
  {
    title: "Permit, utility, and application follow-up",
    icon: ClipboardCheck,
    description:
      "Permits and interconnection are where jobs stall. We stay on the paperwork and the follow-ups so files do not go quiet.",
    items: [
      "Interconnection application support",
      "Permit tracking and AHJ follow-up",
      "Utility deficiency letters and resubmittals",
      "Incentive and rebate paperwork where applicable",
    ],
  },
  {
    title: "Enphase, plan set, and equipment coordination",
    icon: Settings,
    description:
      "Technical back-office tasks that need someone who knows the platforms and the order of operations.",
    items: [
      "Enphase Enlighten and monitoring setup",
      "Plan set coordination with engineers or designers",
      "Equipment ordering and tracking",
      "RMA coordination for failed hardware",
    ],
  },
  {
    title: "CRM cleanup and back-office organization",
    icon: Database,
    description:
      "If the pipeline in your CRM does not match reality, decisions get made blind. We clean stages, notes, and attachments.",
    items: [
      "Stuck job follow-up and status updates",
      "CRM data entry and audits",
      "Document filing and naming consistency",
      "Simple cycle-time views when you want them",
    ],
  },
];

export default function ServicesPage() {
  return (
    <div className="border-b border-stone-200/80 bg-white">
      <section
        className={cn("border-b border-stone-200/80", marketingSectionY)}
        style={{
          background:
            "radial-gradient(ellipse 100% 55% at 50% -10%, #FFF0CC 0%, #ffffff 55%)",
        }}
      >
        <div className={cn(marketingShell)}>
          <div className="max-w-2xl">
            <h1 className={marketingH1}>Solar operations services</h1>
            <p className={cn(marketingLead, "mt-4")}>
              Back-office work for residential solar contractors. We focus on permits, utilities, customer updates, CRM hygiene, proposals, and equipment paperwork. Not a generic VA shop. Solar-specific follow-through.{" "}
              <Link href="/pricing" className="font-medium text-stone-900 underline-offset-4 hover:underline">
                See weekly capacity options
              </Link>
              .
            </p>
          </div>
        </div>
      </section>

      <section className={cn(marketingSectionY)}>
        <div className={cn(marketingShell)}>
          <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
            {services.map((service, i) => (
              <div
                key={i}
                className={cn(
                  marketingCardBase,
                  marketingCardHover,
                  "group flex flex-col border-t-[3px] border-t-amber-200/80 p-6 md:p-7"
                )}
              >
                <div className="mb-4 flex items-start justify-between gap-3">
                  <div className="rounded-lg border border-stone-200 bg-stone-50 p-2.5 text-amber-800 transition-colors group-hover:border-amber-200/70 group-hover:bg-amber-50/50">
                    <service.icon className="h-5 w-5" strokeWidth={1.75} />
                  </div>
                </div>
                <h2 className={cn(marketingH2, "text-xl sm:text-[1.35rem] mb-2")}>
                  {service.title}
                </h2>
                <p className="mb-5 text-sm text-stone-600 leading-relaxed">
                  {service.description}
                </p>
                <ul className="mt-auto flex flex-col gap-2.5 border-t border-stone-100 pt-4">
                  {service.items.map((item, j) => (
                    <li key={j} className="flex items-start gap-2.5 text-sm text-stone-700">
                      <span
                        className="mt-2 h-1 w-1 shrink-0 rounded-full bg-amber-400/90"
                        aria-hidden
                      />
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>

          <div
            className={cn(
              marketingCardBase,
              "mt-14 flex flex-col items-center gap-4 px-6 py-10 text-center md:px-10"
            )}
          >
            <h2 className={cn(marketingH2, "text-center")}>Need something that is not listed?</h2>
            <p className="max-w-xl text-sm text-stone-600 leading-relaxed">
              If it is solar back-office work and you are not sure where it fits, tell us anyway. We will say honestly if it is in scope.
            </p>
            <Link
              href="/request-help"
              className={cn(buttonVariants({ size: "lg" }), marketingAmberCta, "gap-2")}
            >
              {PRIMARY_CTA}
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
