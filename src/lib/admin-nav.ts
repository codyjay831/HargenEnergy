import { NAV_LABELS } from "@/lib/product-language";

export type AdminNavIconKey =
  | "dashboard"
  | "outreach"
  | "discovery"
  | "clients"
  | "requests"
  | "time"
  | "billing"
  | "team"
  | "services"
  | "calendar"
  | "discoveryHours"
  | "account";

export type AdminNavItem = {
  name: string;
  href: string;
  icon: AdminNavIconKey;
};

export const ADMIN_NAV_ITEMS: AdminNavItem[] = [
  { name: "Dashboard", href: "/admin", icon: "dashboard" },
  { name: "Outreach", href: "/admin/outreach", icon: "outreach" },
  { name: "Discovery Inbox", href: "/admin/outreach/discovery", icon: "discovery" },
  { name: NAV_LABELS.adminClients, href: "/admin/clients", icon: "clients" },
  {
    name: NAV_LABELS.adminWorkRequests,
    href: "/admin/requests",
    icon: "requests",
  },
  { name: "Time Tracking", href: "/admin/time", icon: "time" },
  { name: "Billing", href: "/admin/billing", icon: "billing" },
  { name: "Team", href: "/admin/team", icon: "team" },
  { name: "Service Catalog", href: "/admin/services", icon: "services" },
  { name: "Calendar", href: "/admin/settings/calendar", icon: "calendar" },
  {
    name: "Discovery Hours",
    href: "/admin/settings/discovery-availability",
    icon: "discoveryHours",
  },
  { name: "Account", href: "/admin/account", icon: "account" },
];
