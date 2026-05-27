"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import {
  LayoutDashboard,
  Users,
  ClipboardList,
  Clock,
  CreditCard,
  UserCog,
  Megaphone,
  Settings2,
  Shield,
  CalendarDays,
  CalendarClock,
  type LucideIcon,
} from "lucide-react";
import { NAV_LABELS } from "@/lib/product-language";

interface NavItem {
  name: string;
  href: string;
  icon: LucideIcon;
}

const NAV_ITEMS: NavItem[] = [
  { name: "Dashboard", href: "/admin", icon: LayoutDashboard },
  { name: "Outreach", href: "/admin/outreach", icon: Megaphone },
  { name: NAV_LABELS.adminClients, href: "/admin/clients", icon: Users },
  { name: NAV_LABELS.adminWorkRequests, href: "/admin/requests", icon: ClipboardList },
  { name: "Time Tracking", href: "/admin/time", icon: Clock },
  { name: "Billing", href: "/admin/billing", icon: CreditCard },
  { name: "Team", href: "/admin/team", icon: Shield },
  { name: "Service Catalog", href: "/admin/services", icon: Settings2 },
  { name: "Calendar", href: "/admin/settings/calendar", icon: CalendarDays },
  {
    name: "Discovery Hours",
    href: "/admin/settings/discovery-availability",
    icon: CalendarClock,
  },
  { name: "Account", href: "/admin/account", icon: UserCog },
];

export function AdminNav() {
  const pathname = usePathname();

  return (
    <nav className="flex-1 px-3 py-4 space-y-0.5">
      {NAV_ITEMS.map((item) => {
        const isActive =
          item.href === "/admin"
            ? pathname === "/admin"
            : pathname.startsWith(item.href);

        return (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              "flex items-center gap-3 px-3 py-2 text-sm font-medium rounded-lg transition-colors",
              isActive
                ? "bg-slate-100 text-slate-900"
                : "text-slate-600 hover:bg-slate-50 hover:text-slate-900",
            )}
          >
            <item.icon
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
  );
}
