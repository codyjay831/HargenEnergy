import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { AUDIENCE_NOTE, PRIMARY_CTA, TRUST_BULLETS } from "@/lib/marketing/constants";
import {
  marketingAmberCta,
  marketingH2,
  marketingLead,
  marketingShell,
} from "@/components/marketing/marketing-styles";
import { ctaItems } from "./home-data";

export function HomeFinalCta() {
  return (
    <section className="bg-zinc-950 relative overflow-hidden">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            "radial-gradient(ellipse 800px 600px at -5% 115%, rgba(245,158,11,0.12), transparent 65%)",
        }}
      />

      <div className={cn("relative py-16 lg:py-20", marketingShell)}>
        <div className="grid grid-cols-1 gap-10 lg:grid-cols-[1fr_auto] lg:gap-16 items-start">
          <div className="max-w-lg">
            <h2 className={cn(marketingH2, "text-white leading-snug")}>
              Tell us where your solar operations need support.
            </h2>
            <p className={cn(marketingLead, "mt-3 text-zinc-400")}>
              No long-term contracts. No hiring overhead. Just focused solar ops support
              when you need it.
            </p>

            <ul className="mt-5 flex flex-col gap-2">
              {TRUST_BULLETS.map((item) => (
                <li key={item} className="flex items-center gap-2 text-sm text-zinc-300">
                  <span className="h-1 w-1 shrink-0 rounded-full bg-amber-400" aria-hidden />
                  {item}
                </li>
              ))}
            </ul>

            <div className="mt-7 flex flex-col sm:flex-row gap-3">
              <Link
                href="/request-help"
                className={cn(
                  buttonVariants({ size: "lg" }),
                  marketingAmberCta,
                  "justify-center shadow-[0_2px_16px_rgba(245,158,11,0.35)] hover:shadow-[0_4px_24px_rgba(245,158,11,0.50)]"
                )}
              >
                {PRIMARY_CTA}
              </Link>
              <Link
                href="/pricing"
                className={cn(
                  buttonVariants({ size: "lg", variant: "outline" }),
                  "justify-center border-zinc-600 text-zinc-200 hover:bg-zinc-900 hover:text-white"
                )}
              >
                View pricing
              </Link>
            </div>

            <p className="mt-4 text-xs text-zinc-500">{AUDIENCE_NOTE}</p>
          </div>

          <div className="rounded-xl border border-zinc-700/60 bg-zinc-900/80 p-5 lg:min-w-[280px] shadow-[0_4px_24px_rgba(0,0,0,0.30)]">
            <p className="text-[0.6875rem] font-semibold tracking-[0.1em] uppercase text-zinc-500 mb-4">
              Common request reasons
            </p>
            <ul className="flex flex-col gap-3.5">
              {ctaItems.map((item) => (
                <li key={item} className="flex items-start gap-2.5">
                  <span
                    className="mt-2 h-1 w-1 shrink-0 rounded-full bg-amber-400/90"
                    aria-hidden
                  />
                  <span className="text-sm text-zinc-300 leading-snug">{item}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </section>
  );
}
