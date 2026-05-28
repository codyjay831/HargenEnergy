/**
 * Primary search intent per marketing page — one intent per URL.
 */
export const PAGE_INTENTS = {
  home: {
    path: "/",
    primaryKeyword: "solar operations support",
    title: "Hargen Energy | Experienced Solar Project Management Support",
    description:
      "Flexible solar project coordination support for residential solar companies — permits, utility follow-up, inspections, PTO, customer updates, equipment paperwork, proposals, and backlog job support. Experienced help without a full-time hire.",
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
    title: "How Solar Operations Support Works | Flexible Support Levels",
    description:
      "See how Hargen Energy onboards solar companies, matches support levels to workload, and keeps permit, utility, and customer work moving forward.",
  },
  pricing: {
    path: "/pricing",
    primaryKeyword: "solar operations support pricing",
    title: "Solar Operations Support Pricing | Flexible Support Levels",
    description:
      "Flexible solar operations support levels for residential solar companies. Light, steady, and heavy capacity options with honest overflow handling.",
  },
  about: {
    path: "/about",
    primaryKeyword: "solar operations support company",
    title: "About Hargen Energy | US Solar Operations Desk",
    description:
      "Hargen Energy is a US-based solar operations desk for residential contractors. Real people on permits, utilities, CRM hygiene, and backlog job follow-through.",
  },
  requestHelp: {
    path: "/request-help",
    primaryKeyword: "request solar operations support",
    title: "Request a Discovery | Solar Operations Support",
    description:
      "Tell us where your solar operations need support. Request a discovery and hear back within one business day. No long-term contract required to start.",
  },
} as const;

export const INDEXABLE_MARKETING_PATHS = Object.values(PAGE_INTENTS).map((p) => p.path);
