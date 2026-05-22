"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { BRAND } from "@/lib/brand";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { Menu } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const navItems = [
  { name: "Services", href: "/services" },
  { name: "How It Works", href: "/how-it-works" },
  { name: "Pricing", href: "/pricing" },
  { name: "About", href: "/about" },
];

function navLinkClass(href: string, pathname: string | null) {
  const active =
    pathname === href ||
    (href !== "/" && pathname?.startsWith(href));
  return cn(
    "px-3 py-1.5 text-sm rounded-md transition-colors",
    active
      ? "text-stone-900 font-medium bg-amber-50/90 border border-amber-200/60"
      : "text-stone-600 hover:text-stone-900 hover:bg-stone-100/80"
  );
}

export function Navbar() {
  const pathname = usePathname();

  return (
    <header className="sticky top-0 z-50 w-full border-b border-stone-200/90 bg-white/90 backdrop-blur-md supports-[backdrop-filter]:bg-white/75">
      <div className="max-w-6xl mx-auto px-6 flex h-14 items-center justify-between">

        <div className="flex items-center gap-6">
          <Link href="/" className="flex items-center gap-2.5">
            <Image
              src={BRAND.wordmarkSrc}
              alt={BRAND.name}
              width={761}
              height={136}
              className="h-9 w-auto sm:h-10"
              priority
            />
            <span className="hidden text-xs text-stone-500 border-l border-stone-200 pl-2.5 sm:block">
              Solar Ops Desk
            </span>
          </Link>
          <nav className="hidden md:flex items-center gap-0.5">
            {navItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className={navLinkClass(item.href, pathname)}
              >
                {item.name}
              </Link>
            ))}
          </nav>
        </div>

        <div className="flex items-center gap-1">
          <Link
            href="/login"
            className="hidden md:block px-3 py-1.5 text-sm text-stone-600 hover:text-stone-900 rounded-md hover:bg-stone-100/80 transition-colors"
          >
            Login
          </Link>
          <Link
            href="/request-help"
            className={cn(
              buttonVariants({ size: "sm" }),
              "bg-amber-500 hover:bg-amber-600 text-white border-transparent focus-visible:ring-amber-300"
            )}
          >
            Request Support
          </Link>

          <Sheet>
            <SheetTrigger render={<Button variant="ghost" size="icon" className="md:hidden ml-1" />}>
              <Menu className="h-4 w-4" />
              <span className="sr-only">Toggle menu</span>
            </SheetTrigger>
            <SheetContent side="right">
              <nav className="flex flex-col gap-1 mt-8">
                {navItems.map((item) => (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={cn(
                      "text-sm font-medium px-3 py-2 rounded-md transition-colors",
                      pathname === item.href || pathname?.startsWith(item.href)
                        ? "bg-amber-50 text-stone-900 border border-amber-200/60"
                        : "hover:bg-stone-100 text-stone-800"
                    )}
                  >
                    {item.name}
                  </Link>
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
                  className={cn(buttonVariants(), "mt-2 w-full bg-amber-500 hover:bg-amber-600 text-white border-transparent")}
                >
                  Request Support
                </Link>
              </nav>
            </SheetContent>
          </Sheet>
        </div>

      </div>
    </header>
  );
}
