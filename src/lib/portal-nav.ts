import { NAV_LABELS } from "@/lib/product-language";

export type PortalNavIconKey =
  | "dashboard"
  | "work"
  | "blockWork"
  | "submit"
  | "access"
  | "team"
  | "account";

export type PortalNavItem = {
  name: string;
  href: string;
  icon: PortalNavIconKey;
};

export const PORTAL_NAV_ITEMS: PortalNavItem[] = [
  { name: "Dashboard", href: "/portal", icon: "dashboard" },
  { name: NAV_LABELS.portalWork, href: "/portal/requests", icon: "work" },
  { name: NAV_LABELS.portalBlockWork, href: "/portal/block-work", icon: "blockWork" },
  { name: NAV_LABELS.portalSubmit, href: "/portal/requests/new", icon: "submit" },
  { name: "System Access", href: "/portal/access", icon: "access" },
  { name: "Team", href: "/portal/team", icon: "team" },
  { name: "Account", href: "/portal/account", icon: "account" },
];
