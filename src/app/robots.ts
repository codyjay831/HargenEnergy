import type { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/marketing/constants";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: ["/admin/", "/portal/", "/api/", "/setup/"],
    },
    sitemap: `${SITE_URL}/sitemap.xml`,
  };
}
