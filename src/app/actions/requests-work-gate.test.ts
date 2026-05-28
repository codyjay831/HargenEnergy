import { beforeEach, describe, expect, it, vi } from "vitest";
import { EngagementType, RequestStatus } from "@/generated/prisma/client";

vi.mock("server-only", () => ({}));

const mockAuth = vi.fn();
const mockFindUnique = vi.fn();
const mockUpdate = vi.fn();
const mockCheckClientCanStartWork = vi.fn();

vi.mock("@/auth", () => ({
  auth: () => mockAuth(),
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    supportRequest: {
      findUnique: (...args: unknown[]) => mockFindUnique(...args),
      update: (...args: unknown[]) => mockUpdate(...args),
    },
  },
}));

vi.mock("@/lib/client-work-eligibility-guard", () => ({
  checkClientCanStartWork: (...args: unknown[]) => mockCheckClientCanStartWork(...args),
}));

vi.mock("next/cache", () => ({
  revalidatePath: vi.fn(),
}));

vi.mock("@/lib/revalidate-paths", () => ({
  revalidateAdminClientPage: vi.fn(),
}));

vi.mock("@/lib/email", () => ({
  sendRequestConfirmation: vi.fn(),
  sendInternalRequestAlert: vi.fn(),
  sendClientUpdateEmail: vi.fn(),
  sendOverflowApprovalEmail: vi.fn(),
  sendDeferredUpdateEmail: vi.fn(),
  sendOverflowApprovedEmail: vi.fn(),
}));

vi.mock("@/lib/rate-limit", () => ({
  checkRateLimit: vi.fn(),
  getRateLimitIdentifier: vi.fn(),
}));

vi.mock("@/lib/intake-submit", () => ({
  persistPublicIntake: vi.fn(),
}));

vi.mock("@/lib/discovery-catalog", () => ({
  validateRequestedDiscoveryTaskIds: vi.fn(),
}));

vi.mock("@/lib/discovery-scheduling/ensure-scheduling-link", () => ({
  ensureDiscoverySchedulingLink: vi.fn(),
}));

vi.mock("@/lib/discovery-scheduling/scheduling-readiness", () => ({
  getDiscoverySchedulingReadiness: vi.fn(),
}));

vi.mock("@/lib/audit-log", () => ({
  writeAuditLog: vi.fn(),
}));

import { updateRequest } from "@/app/actions/requests";

describe("updateRequest work gate parity", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockAuth.mockResolvedValue({ user: { id: "admin-1", role: "ADMIN" } });
    mockFindUnique.mockResolvedValue({
      id: "req-1",
      clientId: "client-1",
      status: RequestStatus.NEW,
      internalNotes: null,
      client: { engagementType: EngagementType.SUPPORT_BLOCK },
    });
  });

  it("blocks IN_PROGRESS transition when client cannot start work", async () => {
    mockCheckClientCanStartWork.mockResolvedValue({
      ok: false,
      reasonCode: "payment_not_made",
      message: "Payment setup is incomplete. Resolve billing before starting or logging work.",
    });

    const result = await updateRequest("req-1", { status: RequestStatus.IN_PROGRESS });
    expect(result).toEqual({
      error: "Payment setup is incomplete. Resolve billing before starting or logging work.",
    });
    expect(mockUpdate).not.toHaveBeenCalled();
  });
});
