import { NAV_LABELS } from "@/lib/product-language";

/** Primary conversion CTA — use consistently across marketing surfaces. */
export const PRIMARY_CTA = NAV_LABELS.publicCTA;

export const SITE_URL =
  process.env.NEXT_PUBLIC_SITE_URL ?? "https://hargenenergy.com";

export const TRUST_BULLETS = [
  "Reply within one business day",
  "US-based solar operations desk",
  "No long-term contract to start",
] as const;

export const AUDIENCE_NOTE =
  "Built for solar companies, not homeowners shopping for solar.";
