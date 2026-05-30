import { describe, expect, it } from "vitest";
import {
  ACTIVE_DEFAULT_TAB,
  adminClientTabHref,
  isAdminClientTab,
  PROSPECT_DEFAULT_TAB,
  resolveAdminClientTab,
  resolveProspectClientTab,
  resolveVisibleAdminClientTab,
} from "@/lib/admin-client-tabs";

describe("admin-client-tabs", () => {
  it("resolves discovery tab from tab param", () => {
    expect(resolveAdminClientTab("discovery")).toBe("discovery");
  });

  it("prefers explicit tab param when valid", () => {
    expect(resolveAdminClientTab("billing")).toBe("billing");
  });

  it("defaults to overview for active clients when tab is missing", () => {
    expect(resolveAdminClientTab(undefined)).toBe(ACTIVE_DEFAULT_TAB);
    expect(resolveAdminClientTab("invalid")).toBe(ACTIVE_DEFAULT_TAB);
  });

  it("uses custom default tab when tab is missing", () => {
    expect(resolveAdminClientTab(undefined, PROSPECT_DEFAULT_TAB)).toBe("discovery");
  });

  it("builds explicit hrefs for every tab including overview", () => {
    expect(adminClientTabHref("abc", "overview")).toBe("/admin/clients/abc?tab=overview");
    expect(adminClientTabHref("abc", "discovery")).toBe("/admin/clients/abc?tab=discovery");
    expect(adminClientTabHref("abc", "setup")).toBe("/admin/clients/abc?tab=setup");
    expect(adminClientTabHref("abc", "work")).toBe("/admin/clients/abc?tab=work");
    expect(adminClientTabHref("abc", "billing")).toBe("/admin/clients/abc?tab=billing");
  });

  it("resolves work tab from tab param", () => {
    expect(resolveAdminClientTab("work")).toBe("work");
    expect(isAdminClientTab("work")).toBe(true);
  });

  it("validates tab ids", () => {
    expect(isAdminClientTab("billing")).toBe(true);
    expect(isAdminClientTab("nope")).toBe(false);
  });

  it("clamps hidden tabs to a visible fallback for prospects", () => {
    expect(
      resolveProspectClientTab(
        "billing",
        PROSPECT_DEFAULT_TAB,
        {
          showSetupTab: false,
          showBillingTab: false,
        },
      ),
    ).toBe("discovery");

    expect(
      resolveProspectClientTab(
        "setup",
        PROSPECT_DEFAULT_TAB,
        {
          showSetupTab: true,
          showBillingTab: true,
        },
      ),
    ).toBe("setup");
  });

  it("clamps hidden tabs to a visible fallback for active clients", () => {
    expect(
      resolveVisibleAdminClientTab(
        "billing",
        ACTIVE_DEFAULT_TAB,
        {
          showDiscoveryTab: false,
          showWorkTab: false,
          showSetupTab: true,
          showBillingTab: true,
        },
      ),
    ).toBe("billing");
  });
});
