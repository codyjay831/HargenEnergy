import { describe, expect, it } from "vitest";
import { countPortalLoggedInUsers } from "@/lib/portal-user-login";

describe("countPortalLoggedInUsers", () => {
  it("counts only users with lastLoginAt set", () => {
    expect(
      countPortalLoggedInUsers([
        { lastLoginAt: new Date("2026-05-01") },
        { lastLoginAt: null },
        { lastLoginAt: new Date("2026-05-02") },
      ]),
    ).toBe(2);
  });

  it("returns zero when no users have logged in", () => {
    expect(
      countPortalLoggedInUsers([{ lastLoginAt: null }, { lastLoginAt: null }]),
    ).toBe(0);
  });
});
