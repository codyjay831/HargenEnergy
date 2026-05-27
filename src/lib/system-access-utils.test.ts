import { describe, expect, it } from "vitest";
import { SystemAccessStatus } from "@/generated/prisma/client";
import { countPendingSystemAccess } from "@/lib/system-access-utils";

describe("countPendingSystemAccess", () => {
  it("returns zero when there are no items", () => {
    expect(countPendingSystemAccess([])).toBe(0);
  });

  it("counts only NOT_PROVIDED statuses", () => {
    expect(
      countPendingSystemAccess([
        SystemAccessStatus.NOT_PROVIDED,
        SystemAccessStatus.PROVIDED,
        SystemAccessStatus.NOT_PROVIDED,
        SystemAccessStatus.VERIFIED,
      ]),
    ).toBe(2);
  });
});
