import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  AgreementStatus,
  BillingMode,
  ClientStatus,
  EngagementType,
} from "@/generated/prisma/client";
import { getPortalWorkSubmitEligibility } from "@/lib/portal-submit-eligibility";
import {
  ADMIN_WORK_BLOCK_MESSAGES,
  assertClientCanStartWork,
  checkClientWorkTaskSubmit,
  checkClientCanStartWork,
  checkPortalWorkSubmit,
  toAdminWorkBlock,
} from "@/lib/client-work-eligibility-guard";
const mockFindUnique = vi.fn();
const mockWorkTaskCount = vi.fn();
const mockWorkTaskFindUnique = vi.fn();

vi.mock("@/lib/prisma", () => ({
  prisma: {
    client: {
      findUnique: (...args: unknown[]) => mockFindUnique(...args),
    },
    workTask: {
      count: (...args: unknown[]) => mockWorkTaskCount(...args),
      findUnique: (...args: unknown[]) => mockWorkTaskFindUnique(...args),
    },
  },
}));

vi.mock("@/lib/discovery-catalog", () => ({
  countPublicDiscoveryTasks: vi.fn().mockResolvedValue(3),
}));

const activeClient = {
  status: ClientStatus.ACTIVE,
  agreementStatus: AgreementStatus.SIGNED,
  engagementType: EngagementType.SUPPORT_BLOCK,
  billingMode: BillingMode.STRIPE,
  billingOverrideReason: null,
  billingOverrideExpiresAt: null,
  billingOverrideCreatedAt: null,
  billingOverrideCreatedById: null,
  stripeCustomerId: "cus_123",
  stripeSubscriptionId: "sub_123",
  subscriptionStatus: "active",
  subscriptionCurrentPeriodEnd: new Date("2026-06-01"),
  approvedWorkTasks: [{ workTaskId: "task-1" }],
};

describe("toAdminWorkBlock", () => {
  it("returns ok when portal eligibility allows submit", () => {
    const eligibility = getPortalWorkSubmitEligibility({
      status: ClientStatus.ACTIVE,
      agreementStatus: AgreementStatus.SIGNED,
      engagementType: EngagementType.SUPPORT_BLOCK,
      billingMode: BillingMode.STRIPE,
      billingOverrideReason: null,
      billingOverrideExpiresAt: null,
      billingOverrideCreatedAt: null,
      billingOverrideCreatedById: null,
      stripeCustomerId: "cus_123",
      stripeSubscriptionId: "sub_123",
      subscriptionStatus: "active",
      subscriptionCurrentPeriodEnd: new Date("2026-06-01"),
      approvedWorkTaskCount: 2,
      activeCatalogTaskCount: 5,
    });

    expect(toAdminWorkBlock(eligibility)).toEqual({ ok: true });
  });

  it("maps portal block reasons to stable admin messages", () => {
    const eligibility = getPortalWorkSubmitEligibility({
      status: ClientStatus.LEAD,
      agreementStatus: AgreementStatus.NOT_SENT,
      engagementType: EngagementType.SUPPORT_BLOCK,
      billingMode: BillingMode.STRIPE,
      billingOverrideReason: null,
      billingOverrideExpiresAt: null,
      billingOverrideCreatedAt: null,
      billingOverrideCreatedById: null,
      stripeCustomerId: null,
      stripeSubscriptionId: null,
      subscriptionStatus: null,
      subscriptionCurrentPeriodEnd: null,
      approvedWorkTaskCount: 0,
      activeCatalogTaskCount: 0,
    });

    expect(toAdminWorkBlock(eligibility)).toEqual({
      ok: false,
      reasonCode: "not_active",
      message: ADMIN_WORK_BLOCK_MESSAGES.not_active,
    });
  });
});

describe("checkClientCanStartWork", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockWorkTaskFindUnique.mockResolvedValue({
      id: "task-1",
      name: "Permit package",
      isActive: true,
    });
    mockWorkTaskCount.mockImplementation(async (args: { where?: { id?: { in?: string[] } } }) => {
      if (args?.where?.id?.in) {
        return args.where.id.in.length;
      }
      return 5;
    });
  });

  it("allows work when client passes portal submit eligibility", async () => {
    mockFindUnique.mockResolvedValue(activeClient);

    await expect(checkClientCanStartWork("client-1")).resolves.toEqual({ ok: true });
  });

  it("blocks work when payment is not made", async () => {
    mockFindUnique.mockResolvedValue({
      ...activeClient,
      subscriptionStatus: "incomplete",
    });

    const result = await checkClientCanStartWork("client-1");
    expect(result).toEqual({
      ok: false,
      reasonCode: "payment_not_made",
      message: ADMIN_WORK_BLOCK_MESSAGES.payment_not_made,
    });
  });

  it("returns client not found when missing", async () => {
    mockFindUnique.mockResolvedValue(null);

    const result = await checkClientCanStartWork("missing");
    expect(result).toEqual({
      ok: false,
      reasonCode: "client_not_found",
      message: "Client not found.",
    });
  });
});

describe("checkClientWorkTaskSubmit", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockWorkTaskFindUnique.mockResolvedValue({
      id: "task-1",
      name: "Permit package",
      isActive: true,
    });
  });

  it("blocks support-block scoped task when support-block billing is unpaid, even if fixed-fee is active", async () => {
    mockFindUnique.mockResolvedValue({
      billingMode: BillingMode.STRIPE,
      billingOverrideReason: null,
      billingOverrideExpiresAt: null,
      billingOverrideCreatedAt: null,
      billingOverrideCreatedById: null,
      stripeCustomerId: "cus_123",
      stripeSubscriptionId: "sub_123",
      subscriptionStatus: "incomplete",
      subscriptionCurrentPeriodEnd: new Date("2026-06-01"),
    });

    const result = await checkClientWorkTaskSubmit({
      clientId: "client-1",
      client: {
        engagementType: EngagementType.SUPPORT_BLOCK,
        serviceModels: [
          { modelType: "SUPPORT_BLOCK", isActive: true },
          { modelType: "REQUEST_BASED", isActive: true },
        ],
        approvedWorkTasks: [{ workTaskId: "task-1" }],
      },
      workTaskId: "task-1",
      options: {
        entryPoint: "portal_submit",
        actorId: "user-1",
      },
    });

    expect(result).toEqual({
      ok: false,
      reasonCode: "payment_not_ready",
      error:
        "Support Block payment is not ready for this account. Complete billing before starting this work.",
    });
  });
});

describe("checkPortalWorkSubmit", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockWorkTaskCount.mockResolvedValue(5);
  });

  it("returns portal message when blocked", async () => {
    mockFindUnique.mockResolvedValue({
      ...activeClient,
      status: ClientStatus.LEAD,
    });

    const result = await checkPortalWorkSubmit("client-1", {
      entryPoint: "portal_submit",
      actorId: "user-1",
    });

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.reasonCode).toBe("not_active");
      expect(result.error).toContain("activated");
    }
  });
});

describe("assertClientCanStartWork", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockWorkTaskCount.mockResolvedValue(5);
  });

  it("throws with admin message when blocked", async () => {
    mockFindUnique.mockResolvedValue({
      ...activeClient,
      approvedWorkTasks: [],
    });
    mockWorkTaskCount.mockImplementation(async (args: { where?: { id?: { in?: string[] } } }) =>
      args?.where?.id?.in ? 0 : 5,
    );

    await expect(assertClientCanStartWork("client-1")).rejects.toThrow(
      ADMIN_WORK_BLOCK_MESSAGES.scope_not_configured,
    );
  });
});
