import { beforeEach, describe, expect, it, vi } from "vitest";
import { StaffRole } from "@/generated/prisma/client";

vi.mock("server-only", () => ({}));

const mockAuth = vi.fn();

vi.mock("@/auth", () => ({
  auth: () => mockAuth(),
}));

import {
  authorizeStaffAction,
  requireStaff,
} from "@/lib/auth-guards";

function adminSession(staffRole: StaffRole = StaffRole.OWNER) {
  return {
    user: {
      id: "admin-1",
      role: "ADMIN" as const,
      staffRole,
    },
  };
}

describe("requireStaff capabilities", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("denies MEMBER staff without billing.manage", async () => {
    mockAuth.mockResolvedValue(adminSession(StaffRole.MEMBER));

    await expect(requireStaff("billing.manage")).rejects.toThrow(
      "Forbidden. Missing permission.",
    );
  });

  it("denies MEMBER staff without staff.manage", async () => {
    mockAuth.mockResolvedValue(adminSession(StaffRole.MEMBER));

    await expect(requireStaff("staff.manage")).rejects.toThrow(
      "Forbidden. Missing permission.",
    );
  });

  it("allows MEMBER staff with ops.full", async () => {
    mockAuth.mockResolvedValue(adminSession(StaffRole.MEMBER));

    const session = await requireStaff("ops.full");
    expect(session.user.id).toBe("admin-1");
  });

  it("allows OWNER staff with billing.manage", async () => {
    mockAuth.mockResolvedValue(adminSession(StaffRole.OWNER));

    const session = await requireStaff("billing.manage");
    expect(session.user.id).toBe("admin-1");
  });
});

describe("authorizeStaffAction", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns error object when capability is missing", async () => {
    mockAuth.mockResolvedValue(adminSession(StaffRole.MEMBER));

    const result = await authorizeStaffAction("billing.manage");
    expect(result).toEqual({
      ok: false,
      error: "Unauthorized. Admin access required.",
    });
  });
});
