import { describe, expect, it } from "vitest";
import {
  adminClientTabHref,
  isAdminClientTab,
  resolveAdminClientTab,
} from "@/lib/admin-client-tabs";

describe("admin-client-tabs", () => {
  it("resolves legacy open=walkthrough to walkthrough tab", () => {
    expect(resolveAdminClientTab(undefined, "walkthrough")).toBe("walkthrough");
  });

  it("prefers explicit tab param when valid", () => {
    expect(resolveAdminClientTab("billing", undefined)).toBe("billing");
  });

  it("defaults to overview", () => {
    expect(resolveAdminClientTab(undefined, undefined)).toBe("overview");
    expect(resolveAdminClientTab("invalid", undefined)).toBe("overview");
  });

  it("builds hrefs without query for overview", () => {
    expect(adminClientTabHref("abc", "overview")).toBe("/admin/clients/abc");
    expect(adminClientTabHref("abc", "setup")).toBe("/admin/clients/abc?tab=setup");
  });

  it("validates tab ids", () => {
    expect(isAdminClientTab("billing")).toBe(true);
    expect(isAdminClientTab("nope")).toBe(false);
  });
});
