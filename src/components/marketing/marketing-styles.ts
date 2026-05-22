/**
 * Shared visual tokens for public marketing pages.
 * Keep in sync with the homepage: warm neutrals, amber accent, soft depth.
 */

export const marketingShell = "max-w-6xl mx-auto px-4 sm:px-6";

export const marketingSectionY = "py-16 lg:py-20";

export const marketingSectionHeaderMb = "mb-10";

/** Standard section intro block: H2 + lead */
export const marketingSectionIntro = "max-w-2xl";

/** Default section surface (alternates with white cards on pages) */
export const marketingBandWarm =
  "border-b border-stone-200/80 bg-[linear-gradient(180deg,#FAFAF8_0%,#F5F4F1_100%)]";

export const marketingBandWhite = "border-b border-stone-200/80 bg-white";

export const marketingBandProcess =
  "border-b border-stone-200/80 bg-[linear-gradient(180deg,#F5F4F1_0%,#F0EEE9_100%)]";

export const marketingCardBase =
  "rounded-xl border border-stone-200 bg-white shadow-[0_1px_3px_rgba(15,23,42,0.05),0_4px_16px_rgba(15,23,42,0.05)]";

export const marketingCardHover =
  "motion-safe:transition-all motion-safe:duration-200 motion-safe:hover:-translate-y-1 hover:border-amber-200/70 hover:shadow-[0_8px_32px_rgba(15,23,42,0.10),0_2px_8px_rgba(15,23,42,0.05)]";

export const marketingChipNeutral =
  "inline-flex text-[0.6875rem] font-medium text-stone-600 bg-stone-50 border border-stone-200 rounded-md px-2 py-0.5";

/** Append to `buttonVariants({ size: "lg" | "default" | "sm" })` */
export const marketingAmberCta =
  "bg-amber-500 hover:bg-amber-600 text-white border-transparent focus-visible:ring-amber-300 shadow-[0_2px_12px_rgba(245,158,11,0.28)] motion-safe:transition-all motion-safe:duration-200 motion-safe:hover:-translate-y-0.5 hover:shadow-[0_4px_18px_rgba(245,158,11,0.38)]";

/** Navbar primary CTA — slightly smaller than hero but still prominent */
export const marketingNavCta =
  "hidden md:inline-flex bg-amber-500 hover:bg-amber-600 text-white border-transparent focus-visible:ring-amber-300 shadow-[0_1px_8px_rgba(245,158,11,0.25)]";

export const marketingH1 =
  "font-heading text-[2.5rem] sm:text-[3rem] lg:text-[3.25rem] font-semibold tracking-[-0.03em] leading-[1.08] text-stone-950";

export const marketingH2 =
  "font-heading text-[1.625rem] sm:text-[1.875rem] font-semibold tracking-[-0.025em] text-stone-950";

export const marketingH3 =
  "font-heading text-base font-semibold leading-snug text-stone-900";

export const marketingLead = "text-[0.9375rem] sm:text-lg text-stone-600 leading-relaxed";

export const marketingCaption = "text-sm text-stone-500 leading-relaxed";

export const marketingCardTitle = "font-heading text-base font-semibold leading-snug text-stone-900";

export const marketingSymptomLabel =
  "text-[0.6875rem] font-medium uppercase tracking-[0.06em] text-stone-500 mb-2";
