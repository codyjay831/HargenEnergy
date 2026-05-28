import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

const mockAuth = vi.fn();
const mockAssertClientCanStartWork = vi.fn();
const mockCheckClientCanStartWork = vi.fn();
const mockFindUnique = vi.fn();
const mockUpdate = vi.fn();
const mockCreate = vi.fn();

vi.mock("@/auth", () => ({
  auth: () => mockAuth(),
}));

vi.mock("@/lib/client-work-eligibility-guard", () => ({
  assertClientCanStartWork: (...args: unknown[]) => mockAssertClientCanStartWork(...args),
  checkClientCanStartWork: (...args: unknown[]) => mockCheckClientCanStartWork(...args),
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    supportRequest: {
      findUnique: (...args: unknown[]) => mockFindUnique(...args),
      update: (...args: unknown[]) => mockUpdate(...args),
    },
    timeEntry: {
      create: (...args: unknown[]) => mockCreate(...args),
    },
  },
}));

vi.mock("next/cache", () => ({
  revalidatePath: vi.fn(),
}));

import { startTimer, stopTimer } from "@/app/actions/timer";

describe("startTimer work gate", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockAuth.mockResolvedValue({ user: { id: "admin-1", role: "ADMIN" } });
    mockFindUnique.mockResolvedValue({ clientId: "client-1" });
    mockUpdate.mockResolvedValue({});
    mockCheckClientCanStartWork.mockResolvedValue({ ok: true });
  });

  it("throws admin block message when client cannot start work", async () => {
    mockAssertClientCanStartWork.mockRejectedValue(
      new Error("Payment setup is incomplete. Resolve billing before starting or logging work."),
    );

    await expect(startTimer("req-1")).rejects.toThrow(
      "Payment setup is incomplete. Resolve billing before starting or logging work.",
    );
    expect(mockUpdate).not.toHaveBeenCalled();
  });

  it("stops timer without logging time when work becomes blocked", async () => {
    mockFindUnique.mockResolvedValue({
      timerStartedAt: new Date(Date.now() - 10 * 60 * 1000),
      clientId: "client-1",
      handoffTier: null,
      pricingMode: null,
      flatPriceCents: null,
      client: { engagementType: "SUPPORT_BLOCK" },
    });
    mockCheckClientCanStartWork.mockResolvedValue({
      ok: false,
      reasonCode: "payment_not_made",
      message: "Payment setup is incomplete. Resolve billing before starting or logging work.",
    });

    const result = await stopTimer("req-1");
    expect(result).toEqual({
      blocked: true,
      message: "Payment setup is incomplete. Resolve billing before starting or logging work.",
      elapsedMinutes: 0,
      timeEntryId: null,
    });
    expect(mockCreate).not.toHaveBeenCalled();
    expect(mockUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ timerStartedAt: null }),
      }),
    );
  });
});
