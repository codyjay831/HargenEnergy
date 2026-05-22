"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { PRIMARY_CTA } from "@/lib/marketing/constants";
import { marketingNavItems } from "@/lib/marketing/nav";
import { BRAND } from "@/lib/brand";
import { Menu } from "lucide-react";
import { NavbarNavLink } from "./NavbarNavLink";

export function NavbarMobileMenu() {
  return (
    <Sheet>
      <SheetTrigger render={<Button variant="ghost" size="icon" className="lg:hidden ml-0.5" />}>
        <Menu className="h-4 w-4" />
        <span className="sr-only">Toggle menu</span>
      </SheetTrigger>
      <SheetContent side="right">
        <div className="mt-6 mb-4">
          <p className="font-heading text-sm font-semibold text-stone-900">{BRAND.name}</p>
          <p className="text-xs text-stone-500 mt-0.5">{BRAND.tagline}</p>
        </div>
        <nav aria-label="Mobile" className="flex flex-col gap-1">
          {marketingNavItems.map((item) => (
            <NavbarNavLink key={item.href} href={item.href} mobile>
              {item.name}
            </NavbarNavLink>
          ))}
          <hr className="my-3 border-stone-200" />
          <Link
            href="/login"
            className="text-sm font-medium px-3 py-2 rounded-md hover:bg-stone-100 transition-colors text-stone-700"
          >
            Login
          </Link>
          <Link
            href="/request-help"
            className={cn(
              buttonVariants(),
              "mt-2 w-full bg-amber-500 hover:bg-amber-600 text-white border-transparent"
            )}
          >
            {PRIMARY_CTA}
          </Link>
        </nav>
      </SheetContent>
    </Sheet>
  );
}
