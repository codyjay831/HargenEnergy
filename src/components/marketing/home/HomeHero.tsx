import Image from "next/image";
import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { PRIMARY_CTA } from "@/lib/marketing/constants";
import {
  marketingAmberCta,
  marketingCaption,
  marketingLead,
  marketingShell,
} from "@/components/marketing/marketing-styles";

export function HomeHero() {
  return (
    <section className="relative overflow-hidden border-b bg-white">

      {/* ── Mobile / Tablet hero (hidden on lg+) ────────────────────────── */}
      <div className="lg:hidden">
        {/* Full-bleed image with overlay text */}
        <div className="relative w-full" style={{ minHeight: "min(85vh, 700px)" }}>
          <Image
            src="/images/home-hero-mobile.png"
            alt="Solar operations coordinator reviewing work on a tablet with residential solar panels in the background"
            fill
            priority
            sizes="100vw"
            className="object-cover object-top"
          />
          {/* Bottom gradient overlay so text is readable */}
          <div
            aria-hidden
            className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-transparent"
          />
          {/* Text pinned to bottom of image */}
          <div className="absolute bottom-0 left-0 right-0 px-5 pb-8 pt-16">
            <h1 className="mb-3 text-[clamp(2rem,6vw,2.75rem)] font-semibold tracking-[-0.04em] leading-[1.04] text-white">
              <span className="block">Solar operations help</span>
              <span className="block text-amber-400">just when you need it.</span>
            </h1>
            <p className="mb-5 text-[0.9375rem] leading-[1.5] text-white/85 max-w-[480px]">
              Flexible support for residential solar companies with permits, utility follow-up, customer updates, and backlog cleanup.
            </p>
            <div className="flex flex-col gap-2 sm:flex-row sm:gap-3">
              <Link
                href="/request-help"
                className={cn(
                  buttonVariants({ size: "lg" }),
                  marketingAmberCta,
                  "w-full sm:w-auto justify-center"
                )}
              >
                {PRIMARY_CTA}
              </Link>
              <Link
                href="/how-it-works"
                className={cn(
                  buttonVariants({ size: "lg", variant: "outline" }),
                  "w-full sm:w-auto justify-center border-white/30 text-white bg-white/10 backdrop-blur-sm hover:bg-white/20 hover:border-white/50"
                )}
              >
                See how it works
              </Link>
            </div>
            <p className={cn(marketingCaption, "mt-3 leading-snug text-white/60")}>
              Built for solar contractors, not homeowners shopping for solar.
            </p>
          </div>
        </div>
      </div>

      {/* ── Desktop hero (hidden below lg) ──────────────────────────────── */}
      <div className="hidden lg:grid lg:grid-cols-[1fr_1fr] lg:min-h-[600px]">

        {/* Left: copy — vertically centered */}
        <div className="relative z-10 flex items-center py-16 pl-[max(2rem,calc((100vw-80rem)/2+2rem))] pr-16">
          <div className="flex max-w-[520px] flex-col">
            <h1 className="mb-4 text-[clamp(2.25rem,3.2vw,3.25rem)] font-semibold tracking-[-0.045em] leading-[1.02] text-black">
              <span className="block">Solar operations help</span>
              <span className="block text-amber-600">just when you need it.</span>
            </h1>

            <p className="mb-7 text-[1.0625rem] leading-[1.65] text-stone-600 max-w-[460px]">
              Flexible coordination support for residential solar companies —
              permits, utility follow-up, inspections, PTO, customer updates,
              equipment paperwork, proposals, and backlog job support.
            </p>

            <div className="flex items-center gap-3">
              <Link
                href="/request-help"
                className={cn(buttonVariants({ size: "lg" }), marketingAmberCta)}
              >
                {PRIMARY_CTA}
              </Link>
              <Link
                href="/how-it-works"
                className={cn(
                  buttonVariants({ size: "lg", variant: "ghost" }),
                  "text-stone-600 hover:text-stone-900 hover:bg-stone-100 motion-safe:transition-colors"
                )}
              >
                See how it works →
              </Link>
            </div>

            <p className="mt-5 text-[0.8125rem] text-stone-400 leading-snug">
              Built for solar contractors, not homeowners shopping for solar.
            </p>
          </div>
        </div>

        {/* Right: photo — full bleed, no white column gap */}
        <div className="relative overflow-hidden">
          <div
            aria-hidden
            className="absolute inset-y-0 left-0 z-10 w-1/3 bg-gradient-to-r from-white to-transparent pointer-events-none"
          />
          <Image
            src="/images/home-hero.jpg"
            alt="Outdoor workspace with laptop and coffee on a deck overlooking homes with solar panels"
            fill
            priority
            sizes="50vw"
            className="object-cover object-center scale-[1.02]"
          />
        </div>
      </div>
    </section>
  );
}
