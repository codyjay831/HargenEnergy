import type { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/marketing/constants";
import { INDEXABLE_MARKETING_PATHS } from "@/lib/marketing/seo-intents";

export default function sitemap(): MetadataRoute.Sitemap {
  const lastModified = new Date();

  return INDEXABLE_MARKETING_PATHS.map((path) => ({
    url: `${SITE_URL}${path}`,
    lastModified,
    changeFrequency: path === "/" ? "weekly" : "monthly",
    priority: path === "/" ? 1 : path === "/request-help" ? 0.9 : 0.8,
  }));
}
