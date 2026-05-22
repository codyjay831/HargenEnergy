import type { Metadata } from "next";
import { homeMetadata } from "@/lib/marketing/metadata";
import { HomeHero } from "@/components/marketing/home/HomeHero";
import { HomeProblem } from "@/components/marketing/home/HomeProblem";
import { HomeServices } from "@/components/marketing/home/HomeServices";
import { HomeProcess } from "@/components/marketing/home/HomeProcess";
import { HomePricingTeaser } from "@/components/marketing/home/HomePricingTeaser";
import { HomeFinalCta } from "@/components/marketing/home/HomeFinalCta";

export const metadata: Metadata = homeMetadata;

export default function Home() {
  return (
    <div className="flex flex-col font-sans">
      <HomeHero />
      <HomeProblem />
      <HomeServices />
      <HomeProcess />
      <HomePricingTeaser />
      <HomeFinalCta />
    </div>
  );
}
