export const ADMIN_CLIENT_TABS = [
  "overview",
  "walkthrough",
  "setup",
  "billing",
] as const;

export type AdminClientTab = (typeof ADMIN_CLIENT_TABS)[number];

export function isAdminClientTab(value: string): value is AdminClientTab {
  return (ADMIN_CLIENT_TABS as readonly string[]).includes(value);
}

/** Resolve active tab from URL params (`?tab=` with legacy `?open=walkthrough`). */
export function resolveAdminClientTab(
  tab?: string | null,
  open?: string | null,
): AdminClientTab {
  if (open === "walkthrough") {
    return "walkthrough";
  }
  if (tab && isAdminClientTab(tab)) {
    return tab;
  }
  return "overview";
}

export function adminClientTabHref(clientId: string, tab: AdminClientTab): string {
  const base = `/admin/clients/${clientId}`;
  if (tab === "overview") {
    return base;
  }
  return `${base}?tab=${tab}`;
}

export const ADMIN_CLIENT_TAB_LABELS: Record<AdminClientTab, string> = {
  overview: "Overview",
  walkthrough: "Walkthrough",
  setup: "Setup & access",
  billing: "Billing",
};
