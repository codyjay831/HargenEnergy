import { describe, it, expect } from "vitest";
import {
  resolveDiscoveryPrimaryNavigation,
  resolveDiscoverySetupTabHref,
} from "@/lib/discovery-scheduling/discovery-primary-navigation";

describe("resolveDiscoveryPrimaryNavigation", () => {
  const clientId = "cmps17k2y000004jieoex3jki";

  it("routes proposal_setup to setup tab", () => {
    expect(resolveDiscoveryPrimaryNavigation("proposal_setup", clientId)).toEqual({
      kind: "tab",
      href: `/admin/clients/${clientId}?tab=setup`,
    });
  });

  it("routes active_client to setup tab", () => {
    expect(resolveDiscoveryPrimaryNavigation("active_client", clientId)).toEqual({
      kind: "tab",
      href: `/admin/clients/${clientId}?tab=setup`,
    });
  });

  it("routes scheduled to discovery tab behavior", () => {
    expect(resolveDiscoveryPrimaryNavigation("scheduled", clientId)).toEqual({
      kind: "discovery_tab",
    });
  });

  it("returns none for not_a_fit", () => {
    expect(resolveDiscoveryPrimaryNavigation("not_a_fit", clientId)).toEqual({
      kind: "none",
    });
  });
});

describe("resolveDiscoverySetupTabHref", () => {
  it("returns setup tab href", () => {
    expect(resolveDiscoverySetupTabHref("abc")).toBe("/admin/clients/abc?tab=setup");
  });
});
