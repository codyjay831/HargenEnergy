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
  Inbox,
  Settings2,
  Shield,
  CalendarDays,
  CalendarClock,
  FileText,
  type LucideIcon,
} from "lucide-react";
import { ADMIN_NAV_ITEMS, type AdminNavIconKey } from "@/lib/admin-nav";

const ICONS: Record<AdminNavIconKey, LucideIcon> = {
  dashboard: LayoutDashboard,
  outreach: Megaphone,
  discovery: Inbox,
  clients: Users,
  requests: ClipboardList,
  time: Clock,
  billing: CreditCard,
  team: Shield,
  services: Settings2,
  calendar: CalendarDays,
  discoveryHours: CalendarClock,
  account: UserCog,
  agreements: FileText,
};

interface AdminNavProps {
  attentionUnreadCount?: number;
}

export function AdminNav({ attentionUnreadCount = 0 }: AdminNavProps) {
  const pathname = usePathname();

  return (
    <nav className="flex-1 px-3 py-4 space-y-0.5">
      {ADMIN_NAV_ITEMS.map((item) => {
        const isActive =
          item.href === "/admin"
            ? pathname === "/admin"
            : pathname.startsWith(item.href);
        const Icon = ICONS[item.icon];
        const showBadge = item.icon === "requests" && attentionUnreadCount > 0;

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
            <Icon
              className={cn(
                "h-4 w-4 shrink-0",
                isActive ? "text-slate-700" : "text-slate-400",
              )}
            />
            <span className="flex-1">{item.name}</span>
            {showBadge && (
              <span className="inline-flex min-w-5 items-center justify-center rounded-full bg-orange-500 px-1.5 py-0.5 text-[10px] font-bold leading-none text-white">
                {attentionUnreadCount > 99 ? "99+" : attentionUnreadCount}
              </span>
            )}
          </Link>
        );
      })}
    </nav>
  );
}
