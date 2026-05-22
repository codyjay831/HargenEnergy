import Image from "next/image";
import Link from "next/link";
import { BRAND } from "@/lib/brand";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { PRIMARY_CTA } from "@/lib/marketing/constants";
import { marketingNavItems } from "@/lib/marketing/nav";
import { marketingNavCta, marketingShell } from "@/components/marketing/marketing-styles";
import { NavbarNavLink } from "./NavbarNavLink";
import { NavbarMobileMenu } from "./NavbarMobileMenu";

export function Navbar() {
  return (
    <header className="sticky top-0 z-50 w-full border-b border-stone-200/90 bg-white/95 backdrop-blur-sm supports-[backdrop-filter]:bg-white/85">
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:absolute focus:top-2 focus:left-2 focus:z-[100] focus:rounded-md focus:bg-white focus:px-4 focus:py-2 focus:text-sm focus:font-medium focus:text-stone-900 focus:shadow-lg focus:ring-2 focus:ring-amber-400"
      >
        Skip to main content
      </a>

      <div className={cn(marketingShell, "flex h-16 items-center justify-between gap-4")}>
        <div className="flex min-w-0 items-center gap-5 lg:gap-8">
          <Link href="/" className="flex shrink-0 items-center gap-2.5 group">
            <Image
              src={BRAND.iconSrc}
              alt=""
              width={32}
              height={32}
              className="h-8 w-8 rounded-md"
              priority
            />
            <div className="flex flex-col leading-none">
              <span className="font-heading text-[0.9375rem] font-semibold tracking-tight text-stone-900 group-hover:text-stone-950">
                {BRAND.shortName}
                <span className="text-amber-600"> Energy</span>
              </span>
              <span className="mt-0.5 text-[0.625rem] font-medium uppercase tracking-[0.08em] text-stone-500">
                {BRAND.tagline}
              </span>
            </div>
          </Link>

          <nav aria-label="Main" className="hidden lg:flex items-center gap-1">
            {marketingNavItems.map((item) => (
              <NavbarNavLink key={item.href} href={item.href}>
                {item.name}
              </NavbarNavLink>
            ))}
          </nav>
        </div>

        <div className="flex shrink-0 items-center gap-1.5">
          <Link
            href="/login"
            className="hidden md:block px-3 py-2 text-sm text-stone-600 hover:text-stone-900 rounded-md hover:bg-stone-100/80 transition-colors"
          >
            Login
          </Link>
          <Link
            href="/request-help"
            className={cn(buttonVariants({ size: "default" }), marketingNavCta)}
          >
            {PRIMARY_CTA}
          </Link>

          <NavbarMobileMenu />
        </div>
      </div>
    </header>
  );
}
