import Link from "next/link";
import Image from "next/image";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { BRAND } from "@/lib/brand";
import { PRIMARY_CTA } from "@/lib/marketing/constants";
import { marketingNavItems } from "@/lib/marketing/nav";
import { marketingAmberCta, marketingShell } from "@/components/marketing/marketing-styles";

const supportLinks = [
  { label: "Pricing", href: "/pricing" },
  { label: PRIMARY_CTA, href: "/request-help" },
  { label: "Client Login", href: "/login" },
];

export function Footer() {
  return (
    <footer className="border-t border-stone-200/90 bg-white">
      <div className={cn(marketingShell, "py-8 border-b border-stone-200/80")}>
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <p className="font-heading text-base font-semibold text-stone-900">
              Ready to get stuck jobs moving again?
            </p>
            <p className="mt-1 text-sm text-stone-600">
              Tell us where your solar operations need help. We reply within one business day.
            </p>
          </div>
          <Link
            href="/request-help"
            className={cn(buttonVariants({ size: "lg" }), marketingAmberCta, "shrink-0 justify-center")}
          >
            {PRIMARY_CTA}
          </Link>
        </div>
      </div>

      <div className={cn(marketingShell, "py-10")}>
        <div className="grid grid-cols-2 gap-8 sm:grid-cols-[1fr_auto_auto]">
          <div className="col-span-2 sm:col-span-1">
            <Link href="/" className="flex items-center gap-2.5 group w-fit">
              <Image
                src={BRAND.iconSrc}
                alt=""
                width={28}
                height={28}
                className="h-7 w-7 rounded-md"
              />
              <span className="text-sm font-semibold text-stone-900 group-hover:text-stone-950">
                {BRAND.name}
              </span>
            </Link>
            <p className="mt-2 text-xs text-stone-600 leading-relaxed max-w-[260px]">
              {BRAND.tagline} for residential solar companies. Permits, utilities, customer
              updates, CRM cleanup, and stuck job follow-through.
            </p>
          </div>

          <div>
            <p className="text-xs font-semibold uppercase tracking-wider mb-3 text-stone-900">
              Explore
            </p>
            <ul className="flex flex-col gap-2">
              {marketingNavItems.map((l) => (
                <li key={l.href}>
                  <Link
                    href={l.href}
                    className="text-xs text-stone-600 hover:text-stone-900 transition-colors"
                  >
                    {l.name}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <p className="text-xs font-semibold uppercase tracking-wider mb-3 text-stone-900">
              Get started
            </p>
            <ul className="flex flex-col gap-2">
              {supportLinks.map((l) => (
                <li key={l.href}>
                  <Link
                    href={l.href}
                    className="text-xs text-stone-600 hover:text-stone-900 transition-colors"
                  >
                    {l.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </div>

        <div className="mt-8 pt-6 border-t border-stone-200 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
          <p className="text-xs text-stone-500">
            © {new Date().getFullYear()} Hargen Energy LLC. All rights reserved.
          </p>
          <p className="text-xs text-stone-500">
            Built for solar companies, not homeowners shopping for solar.
          </p>
        </div>
      </div>
    </footer>
  );
}
