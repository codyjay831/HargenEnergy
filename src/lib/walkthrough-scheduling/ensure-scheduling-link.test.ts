import { beforeEach, describe, expect, it, vi } from "vitest";
import { WalkthroughSchedulingLinkStatus } from "@/generated/prisma/client";

vi.mock("server-only", () => ({}));

const mockGetReadiness = vi.fn();
const mockFindRequest = vi.fn();
const mockFindLink = vi.fn();
const mockCreateLink = vi.fn();
const mockUpdateLink = vi.fn();
const mockUpdateMany = vi.fn();
const mockSendEmail = vi.fn();
const mockWriteAudit = vi.fn();
const mockRevalidate = vi.fn();

vi.mock("@/lib/walkthrough-scheduling/scheduling-readiness", () => ({
  getWalkthroughSchedulingReadiness: () => mockGetReadiness(),
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    supportRequest: {
      findFirst: (...args: unknown[]) => mockFindRequest(...args),
    },
    walkthroughSchedulingLink: {
      findUnique: (...args: unknown[]) => mockFindLink(...args),
      create: (...args: unknown[]) => mockCreateLink(...args),
      update: (...args: unknown[]) => mockUpdateLink(...args),
      updateMany: (...args: unknown[]) => mockUpdateMany(...args),
    },
  },
}));

vi.mock("@/lib/email", () => ({
  sendWalkthroughSchedulingLinkEmail: (...args: unknown[]) => mockSendEmail(...args),
}));

vi.mock("@/lib/audit-log", () => ({
  writeAuditLog: (...args: unknown[]) => mockWriteAudit(...args),
}));

vi.mock("@/lib/revalidate-paths", () => ({
  revalidateAdminClientPage: (...args: unknown[]) => mockRevalidate(...args),
}));

vi.mock("@/lib/crypto/field-encryption", () => ({
  encryptFieldValue: (value: string) => `enc:${value}`,
  decryptFieldValue: (value: string | null) =>
    value?.startsWith("enc:") ? value.slice(4) : null,
}));

vi.mock("@/lib/walkthrough-scheduling/tokens", () => ({
  createSchedulingRawToken: () => "test-raw-token",
  hashSchedulingToken: () => "test-hash",
  buildSchedulingLinkExpiry: () => new Date("2026-06-01T00:00:00Z"),
  buildWalkthroughSchedulingUrl: (token: string) =>
    `https://app.example.com/schedule/walkthrough/${token}`,
}));

const { ensureWalkthroughSchedulingLink } = await import(
  "@/lib/walkthrough-scheduling/ensure-scheduling-link"
);

const baseRequest = {
  id: "req-1",
  clientId: "client-1",
  client: {
    email: "lead@example.com",
    contactName: "Jane",
    companyName: "Solar Co",
  },
};

beforeEach(() => {
  vi.clearAllMocks();
  mockGetReadiness.mockResolvedValue({ ready: true, blockers: [] });
  mockFindRequest.mockResolvedValue(baseRequest);
  mockFindLink.mockResolvedValue(null);
  mockCreateLink.mockResolvedValue({ id: "link-1" });
  mockSendEmail.mockResolvedValue({ success: true });
});

describe("ensureWalkthroughSchedulingLink", () => {
  it("returns error when scheduling is not ready", async () => {
    mockGetReadiness.mockResolvedValue({
      ready: false,
      blockers: ["Connect Google Calendar"],
    });

    const result = await ensureWalkthroughSchedulingLink({
      supportRequestId: "req-1",
    });

    expect(result).toEqual({ error: "Connect Google Calendar" });
    expect(mockCreateLink).not.toHaveBeenCalled();
  });

  it("returns error when walkthrough request is missing", async () => {
    mockFindRequest.mockResolvedValue(null);

    const result = await ensureWalkthroughSchedulingLink({
      supportRequestId: "req-missing",
    });

    expect(result).toEqual({ error: "Walkthrough request not found." });
  });

  it("creates a scheduling link and returns URL without sending email by default", async () => {
    const result = await ensureWalkthroughSchedulingLink({
      supportRequestId: "req-1",
      audit: { action: "walkthrough.scheduling_link.auto_created" },
    });

    expect(result).toEqual({
      schedulingUrl: "https://app.example.com/schedule/walkthrough/test-raw-token",
    });
    expect(mockCreateLink).toHaveBeenCalled();
    expect(mockSendEmail).not.toHaveBeenCalled();
    expect(mockWriteAudit).toHaveBeenCalled();
  });

  it("returns error when active link exists and errorIfActiveExists is true", async () => {
    mockFindLink.mockResolvedValue({
      id: "link-1",
      status: WalkthroughSchedulingLinkStatus.ACTIVE,
      encryptedToken: "enc:existing-token",
      appointment: null,
    });

    const result = await ensureWalkthroughSchedulingLink({
      supportRequestId: "req-1",
      errorIfActiveExists: true,
    });

    expect(result).toEqual({
      error: "An active scheduling link already exists. Resend or regenerate it.",
    });
  });

  it("reuses active link when errorIfActiveExists is false", async () => {
    mockFindLink.mockResolvedValue({
      id: "link-1",
      status: WalkthroughSchedulingLinkStatus.ACTIVE,
      encryptedToken: "enc:existing-token",
      appointment: null,
    });

    const result = await ensureWalkthroughSchedulingLink({
      supportRequestId: "req-1",
      errorIfActiveExists: false,
    });

    expect(result).toEqual({
      schedulingUrl: "https://app.example.com/schedule/walkthrough/existing-token",
    });
    expect(mockCreateLink).not.toHaveBeenCalled();
  });

  it("sends scheduling email and sets sentAt when sendSchedulingEmail is true", async () => {
    const result = await ensureWalkthroughSchedulingLink({
      supportRequestId: "req-1",
      sendSchedulingEmail: true,
      createdByUserId: "user-1",
    });

    expect(result).toEqual({
      schedulingUrl: "https://app.example.com/schedule/walkthrough/test-raw-token",
    });
    expect(mockSendEmail).toHaveBeenCalled();
    expect(mockUpdateLink).toHaveBeenCalledWith(
      expect.objectContaining({
        data: { sentAt: expect.any(Date) },
      }),
    );
  });
});
