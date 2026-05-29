import { beforeEach, describe, expect, it, vi } from "vitest";
import { BillableType } from "@/generated/prisma/client";

vi.mock("server-only", () => ({}));

const mockAuthorizeStaffAction = vi.fn();
const mockCheckClientCanStartWork = vi.fn();
const mockCreate = vi.fn();

vi.mock("@/lib/auth-guards", () => ({
  authorizeStaffAction: (...args: unknown[]) => mockAuthorizeStaffAction(...args),
}));

vi.mock("@/lib/client-work-eligibility-guard", () => ({
  checkClientCanStartWork: (...args: unknown[]) => mockCheckClientCanStartWork(...args),
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    supportRequest: { findUnique: vi.fn() },
    timeEntry: { create: (...args: unknown[]) => mockCreate(...args) },
  },
}));

vi.mock("next/cache", () => ({
  revalidatePath: vi.fn(),
}));

vi.mock("@/lib/revalidate-paths", () => ({
  revalidateAdminClientPage: vi.fn(),
}));

import { createTimeEntry } from "@/app/actions/time";

describe("createTimeEntry work gate", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockAuthorizeStaffAction.mockResolvedValue({
      ok: true,
      session: { user: { id: "admin-1", role: "ADMIN" } },
    });
  });

  it("returns admin block message when client cannot start work", async () => {
    mockCheckClientCanStartWork.mockResolvedValue({
      ok: false,
      reasonCode: "payment_not_made",
      message: "Payment setup is incomplete. Resolve billing before starting or logging work.",
    });

    const result = await createTimeEntry({
      clientId: "client-1",
      date: new Date(),
      minutes: 30,
      description: "AHJ follow-up",
      billableType: BillableType.INCLUDED,
    });

    expect(result).toEqual({
      error: "Payment setup is incomplete. Resolve billing before starting or logging work.",
    });
    expect(mockCreate).not.toHaveBeenCalled();
  });
});
