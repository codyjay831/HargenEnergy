export const ADMIN_CLIENT_TABS = [
  "overview",
  "work",
  "discovery",
  "setup",
  "billing",
] as const;

export type AdminClientTab = (typeof ADMIN_CLIENT_TABS)[number];

export const PROSPECT_DEFAULT_TAB: AdminClientTab = "discovery";
export const ACTIVE_DEFAULT_TAB: AdminClientTab = "overview";

export function isAdminClientTab(value: string): value is AdminClientTab {
  return (ADMIN_CLIENT_TABS as readonly string[]).includes(value);
}

/** Resolve active tab from URL `?tab=` param, falling back to the provided default. */
export function resolveAdminClientTab(
  tab?: string | null,
  defaultTab: AdminClientTab = ACTIVE_DEFAULT_TAB,
): AdminClientTab {
  if (tab && isAdminClientTab(tab)) {
    return tab;
  }
  return defaultTab;
}

/** Every tab uses an explicit ?tab= query param — no ambiguous bare URLs. */
export function adminClientTabHref(clientId: string, tab: AdminClientTab): string {
  return `/admin/clients/${clientId}?tab=${tab}`;
}

export const ADMIN_CLIENT_TAB_LABELS: Record<AdminClientTab, string> = {
  overview: "Overview",
  work: "Work",
  discovery: "Discovery call",
  setup: "Setup & access",
  billing: "Billing",
};

export type AdminClientTabVisibility = {
  showDiscoveryTab: boolean;
  showWorkTab: boolean;
  showSetupTab: boolean;
  showBillingTab: boolean;
};

/** Clamp requested tab to tabs visible in the prospect onboarding view. */
export function resolveProspectClientTab(
  tabParam: string | null | undefined,
  defaultTab: AdminClientTab = PROSPECT_DEFAULT_TAB,
  visibility: Pick<AdminClientTabVisibility, "showSetupTab" | "showBillingTab">,
): AdminClientTab {
  const allowed: AdminClientTab[] = ["discovery"];
  if (visibility.showSetupTab) {
    allowed.push("setup");
  }
  if (visibility.showBillingTab) {
    allowed.push("billing");
  }

  const requested = resolveAdminClientTab(tabParam, defaultTab);
  if (allowed.includes(requested)) {
    return requested;
  }
  return defaultTab;
}

/** Clamp requested tab to tabs visible in the active client view. */
export function resolveVisibleAdminClientTab(
  tabParam: string | null | undefined,
  defaultTab: AdminClientTab,
  visibility: AdminClientTabVisibility,
): AdminClientTab {
  let activeTab = resolveAdminClientTab(tabParam, defaultTab);

  if (activeTab === "discovery" && !visibility.showDiscoveryTab) {
    activeTab = "overview";
  }
  if (activeTab === "work" && !visibility.showWorkTab) {
    activeTab = "overview";
  }
  if (activeTab === "setup" && !visibility.showSetupTab) {
    activeTab = visibility.showWorkTab
      ? "work"
      : visibility.showDiscoveryTab
        ? "discovery"
        : "overview";
  }
  if (activeTab === "billing" && !visibility.showBillingTab) {
    activeTab = visibility.showWorkTab
      ? "work"
      : visibility.showSetupTab
        ? "setup"
        : visibility.showDiscoveryTab
          ? "discovery"
          : "overview";
  }

  return activeTab;
}
