import type { Metadata } from "next";
import Link from "next/link";
import {
  FileText,
  Clock,
  MessageSquare,
  LayoutGrid,
  Zap,
  Users,
  ArrowRight,
  type LucideIcon,
} from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { PRIMARY_CTA } from "@/lib/marketing/constants";
import { servicesMetadata } from "@/lib/marketing/metadata";
import { services } from "@/components/marketing/home/home-data";
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

const iconMap: Record<(typeof services)[number]["icon"], LucideIcon> = {
  FileText,
  Clock,
  MessageSquare,
  LayoutGrid,
  Zap,
  Users,
};

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
              Back-office work for residential solar contractors. We focus on permits, utilities, customer updates, CRM hygiene, proposals, and equipment paperwork.
            </p>
            <p className={cn(marketingLead, "mt-3")}>
              Not a generic VA shop. Solar-specific follow-through.{" "}
              <Link href="/pricing" className="font-medium text-stone-900 underline-offset-4 hover:underline">
                See weekly capacity options
              </Link>
              .
            </p>
            <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-center">
              <Link
                href="/request-help"
                className={cn(buttonVariants({ size: "lg" }), marketingAmberCta, "gap-2 justify-center")}
              >
                {PRIMARY_CTA}
                <ArrowRight className="h-4 w-4" aria-hidden />
              </Link>
              <Link
                href="/pricing"
                className={cn(
                  buttonVariants({ size: "lg", variant: "outline" }),
                  "justify-center border-stone-200 text-stone-700 hover:text-stone-900"
                )}
              >
                View pricing
              </Link>
            </div>
          </div>
        </div>
      </section>

      <section className={cn(marketingSectionY)}>
        <div className={cn(marketingShell)}>
          <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
            {services.map((service) => {
              const Icon = iconMap[service.icon];
              return (
              <div
                key={service.title}
                className={cn(
                  marketingCardBase,
                  marketingCardHover,
                  "group flex flex-col border-t-[3px] border-t-amber-200/80 p-6 md:p-7"
                )}
              >
                <div className="mb-4 flex items-start justify-between gap-3">
                  <div className="rounded-lg border border-stone-200 bg-stone-50 p-2.5 text-amber-800 transition-colors group-hover:border-amber-200/70 group-hover:bg-amber-50/50">
                    <Icon className="h-5 w-5" strokeWidth={1.75} aria-hidden />
                  </div>
                </div>
                <h2 className={cn(marketingH2, "text-xl sm:text-[1.35rem] mb-2")}>
                  {service.title}
                </h2>
                <p className="mb-5 text-sm text-stone-600 leading-relaxed">
                  {service.desc}
                </p>
                <p className="text-[0.72rem] font-semibold uppercase tracking-[0.08em] text-stone-500">
                  Common outcomes
                </p>
                <ul className="mt-auto flex flex-col gap-2.5 border-t border-stone-100 pt-4">
                  {service.details.map((item) => (
                    <li key={item} className="flex items-start gap-2.5 text-sm text-stone-700">
                      <span
                        className="mt-2 h-1 w-1 shrink-0 rounded-full bg-amber-400/90"
                        aria-hidden
                      />
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </div>
            );
            })}
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
              <ArrowRight className="h-4 w-4" aria-hidden />
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
