import { beforeEach, describe, expect, it, vi } from "vitest";
import { AgreementType } from "@/generated/prisma/client";
import { PRIVACY_VERSION, TERMS_VERSION } from "@/lib/legal-versions";

const mockFindMany = vi.fn();
const mockCreateMany = vi.fn();
const mockHeaders = vi.fn();

vi.mock("server-only", () => ({}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    agreementAcceptance: {
      findMany: (...args: unknown[]) => mockFindMany(...args),
      createMany: (...args: unknown[]) => mockCreateMany(...args),
    },
  },
}));

vi.mock("next/headers", () => ({
  headers: (...args: unknown[]) => mockHeaders(...args),
}));

const { hasAcceptedCurrentTerms, recordTermsAcceptance } = await import(
  "@/lib/legal-acceptance"
);

describe("hasAcceptedCurrentTerms", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns false when no acceptances exist", async () => {
    mockFindMany.mockResolvedValue([]);

    await expect(hasAcceptedCurrentTerms("user-1")).resolves.toBe(false);
  });

  it("returns false when only terms are accepted", async () => {
    mockFindMany.mockResolvedValue([
      { type: AgreementType.PORTAL_TERMS, version: TERMS_VERSION },
    ]);

    await expect(hasAcceptedCurrentTerms("user-1")).resolves.toBe(false);
  });

  it("returns false when accepted versions are stale", async () => {
    mockFindMany.mockResolvedValue([
      { type: AgreementType.PORTAL_TERMS, version: "2026-05-01" },
      { type: AgreementType.PRIVACY, version: "2026-05-01" },
    ]);

    await expect(hasAcceptedCurrentTerms("user-1")).resolves.toBe(false);
  });

  it("returns true when current terms and privacy are both accepted", async () => {
    mockFindMany.mockResolvedValue([
      { type: AgreementType.PORTAL_TERMS, version: TERMS_VERSION },
      { type: AgreementType.PRIVACY, version: PRIVACY_VERSION },
    ]);

    await expect(hasAcceptedCurrentTerms("user-1")).resolves.toBe(true);
  });
});

describe("recordTermsAcceptance", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockHeaders.mockResolvedValue({
      get: (name: string) => {
        if (name === "x-forwarded-for") return "203.0.113.25";
        if (name === "user-agent") return "vitest-agent";
        return null;
      },
    });
  });

  it("creates acceptance rows for terms and privacy at current versions", async () => {
    mockCreateMany.mockResolvedValue({ count: 2 });

    await recordTermsAcceptance({
      userId: "user-1",
      clientId: "client-1",
    });

    expect(mockCreateMany).toHaveBeenCalledTimes(1);
    const args = mockCreateMany.mock.calls[0]?.[0];
    expect(args.data).toHaveLength(2);
    expect(args.data).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          userId: "user-1",
          clientId: "client-1",
          type: AgreementType.PORTAL_TERMS,
          version: TERMS_VERSION,
          acceptedIp: "203.0.113.25",
          acceptedUserAgent: "vitest-agent",
        }),
        expect.objectContaining({
          userId: "user-1",
          clientId: "client-1",
          type: AgreementType.PRIVACY,
          version: PRIVACY_VERSION,
          acceptedIp: "203.0.113.25",
          acceptedUserAgent: "vitest-agent",
        }),
      ]),
    );
  });
});
