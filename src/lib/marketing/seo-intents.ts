/**
 * Primary search intent per marketing page — one intent per URL.
 */
export const PAGE_INTENTS = {
  home: {
    path: "/",
    primaryKeyword: "solar operations support",
    title: "Hargen Energy | Back-Office Solar Support When Jobs Get Stuck",
    description:
      "Residential solar operations support for permits, utility follow-up, customer updates, CRM cleanup, and stuck jobs. Add back-office capacity without another full-time hire.",
  },
  services: {
    path: "/services",
    primaryKeyword: "solar back office services",
    title: "Solar Operations Services | Permits, Utilities & CRM Support",
    description:
      "Solar-specific back-office services for residential contractors: permit and utility follow-up, customer communication, proposals, Enphase setup, and CRM cleanup.",
  },
  howItWorks: {
    path: "/how-it-works",
    primaryKeyword: "how solar operations support works",
    title: "How Solar Operations Support Works | Weekly Capacity Blocks",
    description:
      "See how Hargen Energy onboards solar companies, reserves weekly support capacity, and keeps permit, utility, and customer work moving forward.",
  },
  pricing: {
    path: "/pricing",
    primaryKeyword: "solar operations support pricing",
    title: "Solar Operations Support Pricing | Weekly Support Blocks",
    description:
      "Flexible weekly solar operations support blocks for residential solar companies. Light, core, and priority capacity options with honest overflow handling.",
  },
  about: {
    path: "/about",
    primaryKeyword: "solar operations support company",
    title: "About Hargen Energy | US Solar Operations Desk",
    description:
      "Hargen Energy is a US-based solar operations desk for residential contractors. Real people on permits, utilities, CRM hygiene, and stuck job follow-through.",
  },
  requestHelp: {
    path: "/request-help",
    primaryKeyword: "request solar operations support",
    title: "Request a Walkthrough | Solar Operations Support",
    description:
      "Tell us where your solar operations are stuck. Request a walkthrough and hear back within one business day. No long-term contract required to start.",
  },
} as const;

export const INDEXABLE_MARKETING_PATHS = Object.values(PAGE_INTENTS).map((p) => p.path);
