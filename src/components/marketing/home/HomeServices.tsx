import Link from "next/link";
import {
  FileText,
  Clock,
  MessageSquare,
  LayoutGrid,
  Zap,
  Users,
  ChevronRight,
  type LucideIcon,
} from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  marketingBandWhite,
  marketingCaption,
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
import { services } from "./home-data";

const iconMap: Record<(typeof services)[number]["icon"], LucideIcon> = {
  FileText,
  Clock,
  MessageSquare,
  LayoutGrid,
  Zap,
  Users,
};

export function HomeServices() {
  return (
    <section id="services" className={marketingBandWhite}>
      <div className={cn(marketingSectionY, marketingShell)}>
        <div className={cn(marketingSectionIntro, marketingSectionHeaderMb, "flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between")}>
          <div>
            <h2 className={cn(marketingH2, "leading-snug max-w-md")}>
              Support for the work that keeps projects moving.
            </h2>
            <p className={cn(marketingLead, "mt-3 max-w-lg")}>
              Solar-specific back-office help for permits, utilities, customer updates,
              proposals, equipment setup, and stuck job resolution.
            </p>
          </div>
          <Link
            href="/services"
            className={cn(
              buttonVariants({ variant: "outline", size: "sm" }),
              "shrink-0 gap-1 border-stone-200 self-start sm:self-auto"
            )}
          >
            View all services
            <ChevronRight className="h-3.5 w-3.5" aria-hidden />
          </Link>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {services.map(({ icon, title, desc, example }) => {
            const Icon = iconMap[icon];
            return (
              <div
                key={title}
                className={cn(
                  marketingCardBase,
                  marketingCardHover,
                  "group relative p-5 flex flex-col gap-4 border-t-[3px] border-t-amber-200/80"
                )}
              >
                <div className="rounded-lg border border-stone-200 bg-stone-50 p-2 text-stone-700 w-fit motion-safe:transition-colors motion-safe:duration-200 group-hover:border-amber-200/60 group-hover:bg-amber-50/40">
                  <Icon className="h-4 w-4" strokeWidth={1.75} aria-hidden />
                </div>
                <div className="flex flex-col gap-1.5">
                  <h3 className={marketingCardTitle}>{title}</h3>
                  <p className="text-sm text-stone-600 leading-relaxed">{desc}</p>
                </div>
                <div className="mt-auto pt-3 border-t border-stone-100">
                  <p className={cn(marketingCaption, "text-stone-500")}>
                    Example: {example}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
