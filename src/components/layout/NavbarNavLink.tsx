"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

type NavbarNavLinkProps = {
  href: string;
  children: React.ReactNode;
  className?: string;
  mobile?: boolean;
};

export function NavbarNavLink({
  href,
  children,
  className,
  mobile = false,
}: NavbarNavLinkProps) {
  const pathname = usePathname();
  const active =
    pathname === href || (href !== "/" && pathname?.startsWith(href));

  if (mobile) {
    return (
      <Link
        href={href}
        className={cn(
          "text-sm font-medium px-3 py-2 rounded-md transition-colors",
          active
            ? "bg-amber-50 text-stone-900 border border-amber-200/60"
            : "hover:bg-stone-100 text-stone-800",
          className
        )}
      >
        {children}
      </Link>
    );
  }

  return (
    <Link
      href={href}
      className={cn(
        "px-3 py-1.5 text-sm rounded-md transition-colors",
        active
          ? "text-stone-900 font-medium bg-amber-50/90 border border-amber-200/60"
          : "text-stone-600 hover:text-stone-900 hover:bg-stone-100/80",
        className
      )}
    >
      {children}
    </Link>
  );
}
