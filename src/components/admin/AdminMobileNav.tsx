"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  CalendarClock,
  CalendarDays,
  ClipboardList,
  Clock,
  CreditCard,
  LayoutDashboard,
  Megaphone,
  Menu,
  Settings2,
  Shield,
  UserCog,
  Users,
  type LucideIcon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { LogoutButton } from "@/components/layout/LogoutButton";
import { cn } from "@/lib/utils";
import { ADMIN_NAV_ITEMS, type AdminNavIconKey } from "@/lib/admin-nav";

const ICONS: Record<AdminNavIconKey, LucideIcon> = {
  dashboard: LayoutDashboard,
  outreach: Megaphone,
  clients: Users,
  requests: ClipboardList,
  time: Clock,
  billing: CreditCard,
  team: Shield,
  services: Settings2,
  calendar: CalendarDays,
  discoveryHours: CalendarClock,
  account: UserCog,
};

export function AdminMobileNav() {
  const pathname = usePathname();

  return (
    <Sheet>
      <SheetTrigger
        render={<Button variant="ghost" size="icon-sm" className="md:hidden" />}
      >
        <Menu className="h-4 w-4" />
        <span className="sr-only">Open admin menu</span>
      </SheetTrigger>
      <SheetContent side="left" className="w-[17rem] p-0 sm:max-w-none">
        <div className="border-b border-slate-200 px-5 py-4">
          <Link href="/" className="block">
            <span className="text-lg font-bold tracking-tight text-slate-900">Hargen</span>
            <span className="ml-1 text-lg font-bold tracking-tight text-orange-500">Admin</span>
          </Link>
        </div>
        <nav className="max-h-[calc(100dvh-9rem)] overflow-y-auto px-3 py-4 space-y-0.5">
          {ADMIN_NAV_ITEMS.map((item) => {
            const isActive =
              item.href === "/admin"
                ? pathname === "/admin"
                : pathname.startsWith(item.href);
            const Icon = ICONS[item.icon];

            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex min-h-11 items-center gap-3 rounded-lg px-3 py-3 text-sm font-medium transition-colors",
                  isActive
                    ? "bg-slate-100 text-slate-900"
                    : "text-slate-600 hover:bg-slate-50 hover:text-slate-900",
                )}
              >
                <Icon
                  className={cn(
                    "h-4 w-4 shrink-0",
                    isActive ? "text-slate-700" : "text-slate-400",
                  )}
                />
                {item.name}
              </Link>
            );
          })}
        </nav>
        <div className="border-t border-slate-200 p-3">
          <LogoutButton />
        </div>
      </SheetContent>
    </Sheet>
  );
}
