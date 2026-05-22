import { SITE_URL } from "@/lib/marketing/constants";
import { BRAND } from "@/lib/brand";

export function MarketingJsonLd() {
  const organization = {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: BRAND.name,
    url: SITE_URL,
    logo: `${SITE_URL}${BRAND.iconSrc}`,
    description:
      "Solar operations support desk for residential solar companies. Permits, utilities, customer updates, CRM cleanup, and stuck job follow-through.",
    areaServed: {
      "@type": "Country",
      name: "United States",
    },
  };

  const website = {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: BRAND.name,
    url: SITE_URL,
    description:
      "Back-office solar operations support for residential solar contractors.",
  };

  const service = {
    "@context": "https://schema.org",
    "@type": "Service",
    name: "Solar Operations Support",
    provider: {
      "@type": "Organization",
      name: BRAND.name,
      url: SITE_URL,
    },
    areaServed: {
      "@type": "Country",
      name: "United States",
    },
    serviceType: "Solar back-office operations support",
    description:
      "Weekly capacity blocks for permit follow-up, utility applications, customer communication, CRM cleanup, and stuck job resolution.",
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(organization) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(website) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(service) }}
      />
    </>
  );
}
