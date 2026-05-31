import type { Metadata } from "next";
import { SITE_URL } from "./constants";
import { PAGE_INTENTS } from "./seo-intents";

const defaultTitle = PAGE_INTENTS.home.title;
const defaultDescription = PAGE_INTENTS.home.description;

type MarketingMetadataOptions = {
  title?: string;
  description?: string;
  path?: string;
  keywords?: string[];
};

export function createMarketingMetadata({
  title,
  description = defaultDescription,
  path = "",
  keywords = [],
}: MarketingMetadataOptions = {}): Metadata {
  const pageTitle = title ?? defaultTitle;
  const url = `${SITE_URL}${path}`;

  return {
    title: pageTitle,
    description,
    keywords: keywords.length > 0 ? keywords : undefined,
    alternates: {
      canonical: url,
    },
    openGraph: {
      title: pageTitle,
      description,
      url,
      siteName: "Hargen Energy",
      type: "website",
      locale: "en_US",
    },
    twitter: {
      card: "summary_large_image",
      title: pageTitle,
      description,
    },
  };
}

export const homeMetadata = createMarketingMetadata({
  title: PAGE_INTENTS.home.title,
  description: PAGE_INTENTS.home.description,
  path: PAGE_INTENTS.home.path,
  keywords: [
    PAGE_INTENTS.home.primaryKeyword,
    "residential solar back office",
    "solar permit follow up",
    "solar utility interconnection support",
    "solar CRM cleanup",
  ],
});

export const servicesMetadata = createMarketingMetadata({
  title: PAGE_INTENTS.services.title,
  description: PAGE_INTENTS.services.description,
  path: PAGE_INTENTS.services.path,
  keywords: [
    PAGE_INTENTS.services.primaryKeyword,
    "solar permit support",
    "solar customer communication",
    "Enphase setup support",
  ],
});

export const howItWorksMetadata = createMarketingMetadata({
  title: PAGE_INTENTS.howItWorks.title,
  description: PAGE_INTENTS.howItWorks.description,
  path: PAGE_INTENTS.howItWorks.path,
  keywords: [
    PAGE_INTENTS.howItWorks.primaryKeyword,
    "solar ops onboarding",
    "flexible prepaid solar operations support",
  ],
});

export const pricingMetadata = createMarketingMetadata({
  title: PAGE_INTENTS.pricing.title,
  description: PAGE_INTENTS.pricing.description,
  path: PAGE_INTENTS.pricing.path,
  keywords: [
    PAGE_INTENTS.pricing.primaryKeyword,
    "solar back office pricing",
    "weekly solar operations capacity",
  ],
});

export const aboutMetadata = createMarketingMetadata({
  title: PAGE_INTENTS.about.title,
  description: PAGE_INTENTS.about.description,
  path: PAGE_INTENTS.about.path,
  keywords: [
    PAGE_INTENTS.about.primaryKeyword,
    "US solar operations desk",
    "residential solar contractor support",
  ],
});

export const requestHelpMetadata = createMarketingMetadata({
  title: PAGE_INTENTS.requestHelp.title,
  description: PAGE_INTENTS.requestHelp.description,
  path: PAGE_INTENTS.requestHelp.path,
  keywords: [
    PAGE_INTENTS.requestHelp.primaryKeyword,
    "solar discovery request",
    "solar operations help",
  ],
});
