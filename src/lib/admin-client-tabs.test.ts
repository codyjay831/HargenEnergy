import { describe, expect, it } from "vitest";
import {
  adminClientTabHref,
  isAdminClientTab,
  resolveAdminClientTab,
} from "@/lib/admin-client-tabs";

describe("admin-client-tabs", () => {
  it("resolves discovery tab from tab param", () => {
    expect(resolveAdminClientTab("discovery")).toBe("discovery");
  });

  it("prefers explicit tab param when valid", () => {
    expect(resolveAdminClientTab("billing")).toBe("billing");
  });

  it("defaults to overview", () => {
    expect(resolveAdminClientTab(undefined)).toBe("overview");
    expect(resolveAdminClientTab("invalid")).toBe("overview");
  });

  it("builds hrefs without query for overview", () => {
    expect(adminClientTabHref("abc", "overview")).toBe("/admin/clients/abc");
    expect(adminClientTabHref("abc", "setup")).toBe("/admin/clients/abc?tab=setup");
    expect(adminClientTabHref("abc", "work")).toBe("/admin/clients/abc?tab=work");
  });

  it("resolves work tab from tab param", () => {
    expect(resolveAdminClientTab("work")).toBe("work");
    expect(isAdminClientTab("work")).toBe(true);
  });

  it("validates tab ids", () => {
    expect(isAdminClientTab("billing")).toBe(true);
    expect(isAdminClientTab("nope")).toBe(false);
  });
});
