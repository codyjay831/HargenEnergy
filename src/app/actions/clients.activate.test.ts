import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  AgreementStatus,
  ClientStatus,
  EngagementType,
} from "@/generated/prisma/client";

const mockRequireStaff = vi.fn();
const mockFindUnique = vi.fn();
const mockUpdate = vi.fn();
const mockApplyIntake = vi.fn();
const mockRevalidateAdminClientPage = vi.fn();
const mockRevalidatePortalClientSurfaces = vi.fn();

vi.mock("server-only", () => ({}));

vi.mock("@/lib/auth-guards", () => ({
  requireStaff: (...args: unknown[]) => mockRequireStaff(...args),
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    client: {
      findUnique: (...args: unknown[]) => mockFindUnique(...args),
      update: (...args: unknown[]) => mockUpdate(...args),
    },
  },
}));

vi.mock("@/lib/intake-engagement", () => ({
  applyIntakeWorkTasksToClient: (...args: unknown[]) => mockApplyIntake(...args),
}));

vi.mock("@/lib/revalidate-paths", () => ({
  revalidateAdminClientPage: (...args: unknown[]) =>
    mockRevalidateAdminClientPage(...args),
  revalidatePortalClientSurfaces: (...args: unknown[]) =>
    mockRevalidatePortalClientSurfaces(...args),
}));

const { activateClient } = await import("@/app/actions/clients");

function makeClient(overrides: Record<string, unknown> = {}) {
  return {
    id: "client-1",
    status: ClientStatus.LEAD,
    agreementStatus: AgreementStatus.SIGNED,
    agreementUrl: "https://example.com/signed.pdf",
    agreementOverrideReason: null,
    engagementType: EngagementType.REQUEST_BASED,
    serviceModels: [],
    approvedWorkTasks: [{ workTaskId: "task-1" }],
    activatedAt: null,
    ...overrides,
  };
}

describe("activateClient", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockRequireStaff.mockResolvedValue({
      user: { id: "admin-1" },
    });
    mockUpdate.mockResolvedValue({ id: "client-1" });
    mockApplyIntake.mockResolvedValue({
      ok: true,
      appliedCount: 0,
      skippedCount: 0,
      totalFromIntake: 0,
    });
  });

  it("blocks activation when agreement is NOT_SENT", async () => {
    mockFindUnique.mockResolvedValue(
      makeClient({ agreementStatus: AgreementStatus.NOT_SENT }),
    );

    const result = await activateClient("client-1");
    expect("error" in result && result.error).toContain("Service agreement");
    expect(mockUpdate).not.toHaveBeenCalled();
  });

  it("blocks activation when agreement is SENT", async () => {
    mockFindUnique.mockResolvedValue(
      makeClient({
        agreementStatus: AgreementStatus.SENT,
        agreementUrl: "https://example.com/agreement-to-sign",
      }),
    );

    const result = await activateClient("client-1");
    expect("error" in result && result.error).toContain("Service agreement");
    expect(mockUpdate).not.toHaveBeenCalled();
  });

  it("blocks activation when SIGNED but agreement URL is missing", async () => {
    mockFindUnique.mockResolvedValue(
      makeClient({ agreementStatus: AgreementStatus.SIGNED, agreementUrl: null }),
    );

    const result = await activateClient("client-1");
    expect("error" in result && result.error).toContain("signed agreement link");
    expect(mockUpdate).not.toHaveBeenCalled();
  });

  it("activates when SIGNED and agreement URL exists", async () => {
    mockFindUnique.mockResolvedValue(makeClient());

    const result = await activateClient("client-1");
    expect(result).toEqual({ success: true });
    expect(mockUpdate).toHaveBeenCalledTimes(1);
    expect(mockRevalidateAdminClientPage).toHaveBeenCalledWith("client-1");
    expect(mockRevalidatePortalClientSurfaces).toHaveBeenCalledTimes(1);
  });

  it("activates when WAIVED with reason", async () => {
    mockFindUnique.mockResolvedValue(
      makeClient({
        agreementStatus: AgreementStatus.WAIVED,
        agreementOverrideReason: "Legacy contract exception",
      }),
    );

    const result = await activateClient("client-1");
    expect(result).toEqual({ success: true });
    expect(mockUpdate).toHaveBeenCalledTimes(1);
  });

  it("blocks activation when WAIVED without reason", async () => {
    mockFindUnique.mockResolvedValue(
      makeClient({
        agreementStatus: AgreementStatus.WAIVED,
        agreementOverrideReason: "   ",
      }),
    );

    const result = await activateClient("client-1");
    expect("error" in result && result.error).toContain("waiver reason");
    expect(mockUpdate).not.toHaveBeenCalled();
  });

  it("blocks support block activation when approved scope is missing", async () => {
    mockFindUnique.mockResolvedValue(
      makeClient({
        engagementType: EngagementType.SUPPORT_BLOCK,
        approvedWorkTasks: [],
      }),
    );

    const result = await activateClient("client-1");
    expect("error" in result && result.error).toContain("approved work type");
    expect(mockUpdate).not.toHaveBeenCalled();
  });

  it("returns idempotent success when already ACTIVE", async () => {
    mockFindUnique.mockResolvedValue(makeClient({ status: ClientStatus.ACTIVE }));

    const result = await activateClient("client-1");
    expect(result).toEqual({ success: true });
    expect(mockUpdate).not.toHaveBeenCalled();
  });

  it("applies the same activation guard for PAUSED and CANCELLED clients", async () => {
    mockFindUnique.mockResolvedValueOnce(
      makeClient({ status: ClientStatus.PAUSED, agreementUrl: null }),
    );
    const pausedResult = await activateClient("client-1");
    expect("error" in pausedResult && pausedResult.error).toContain(
      "signed agreement link",
    );
    expect(mockUpdate).not.toHaveBeenCalled();

    mockFindUnique.mockResolvedValueOnce(
      makeClient({
        status: ClientStatus.CANCELLED,
        agreementStatus: AgreementStatus.SIGNED,
        agreementUrl: "https://example.com/signed.pdf",
      }),
    );
    const cancelledResult = await activateClient("client-1");
    expect(cancelledResult).toEqual({ success: true });
    expect(mockUpdate).toHaveBeenCalledTimes(1);
  });
});
