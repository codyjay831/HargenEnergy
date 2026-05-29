"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  ClipboardList,
  KeyRound,
  LayoutDashboard,
  Menu,
  PlusCircle,
  UserCircle,
  Users,
  type LucideIcon,
} from "lucide-react";
import { LogoutButton } from "@/components/layout/LogoutButton";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { cn } from "@/lib/utils";
import { PORTAL_NAV_ITEMS, type PortalNavIconKey } from "@/lib/portal-nav";

const ICONS: Record<PortalNavIconKey, LucideIcon> = {
  dashboard: LayoutDashboard,
  work: ClipboardList,
  submit: PlusCircle,
  access: KeyRound,
  team: Users,
  account: UserCircle,
};

type PortalMobileNavProps = {
  companyName: string;
  logoDisplayUrl: string | null;
  userLabel: string;
};

export function PortalMobileNav({
  companyName,
  logoDisplayUrl,
  userLabel,
}: PortalMobileNavProps) {
  const pathname = usePathname();

  return (
    <Sheet>
      <SheetTrigger
        render={<Button variant="ghost" size="icon-sm" className="md:hidden" />}
      >
        <Menu className="h-4 w-4" />
        <span className="sr-only">Open portal menu</span>
      </SheetTrigger>
      <SheetContent
        side="left"
        className="w-[17rem] border-slate-800 bg-[#0f172a] p-0 text-white sm:max-w-none"
      >
        <div className="border-b border-slate-800 p-5">
          <Link href="/portal" className="flex items-center gap-2">
            {logoDisplayUrl ? (
              <Image
                src={logoDisplayUrl}
                alt=""
                width={32}
                height={32}
                className="h-8 w-8 rounded object-contain bg-white/10"
                unoptimized
              />
            ) : (
              <div className="flex h-8 w-8 items-center justify-center rounded bg-primary font-bold text-[#0f172a]">
                H
              </div>
            )}
            <span className="truncate font-bold tracking-tight">{companyName}</span>
          </Link>
        </div>
        <nav className="max-h-[calc(100dvh-10rem)] overflow-y-auto px-3 py-4 space-y-1">
          {PORTAL_NAV_ITEMS.map((item) => {
            const isActive =
              item.href === "/portal"
                ? pathname === "/portal"
                : pathname.startsWith(item.href);
            const Icon = ICONS[item.icon];

            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex min-h-11 items-center gap-3 rounded-md px-3 py-3 text-sm font-medium transition-colors",
                  isActive
                    ? "bg-slate-800 text-white"
                    : "text-slate-300 hover:bg-slate-800 hover:text-white",
                )}
              >
                <Icon className="h-4 w-4" />
                {item.name}
              </Link>
            );
          })}
        </nav>
        <div className="border-t border-slate-800 p-4">
          <p className="px-3 text-xs font-semibold uppercase tracking-wider text-slate-500">
            Logged in as
          </p>
          <p className="truncate px-3 py-2 text-sm font-medium text-slate-200">{userLabel}</p>
          <LogoutButton />
        </div>
      </SheetContent>
    </Sheet>
  );
}
