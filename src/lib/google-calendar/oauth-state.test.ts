import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

const mockGetRedisClient = vi.fn();

vi.mock("@/lib/redis-client", () => ({
  getRedisClient: () => mockGetRedisClient(),
}));

import {
  consumeGoogleOAuthState,
  createGoogleOAuthState,
} from "@/lib/google-calendar/oauth-state";

describe("google oauth state", () => {
  const originalNodeEnv = process.env.NODE_ENV;

  beforeEach(() => {
    vi.clearAllMocks();
    mockGetRedisClient.mockReturnValue(null);
  });

  afterEach(() => {
    process.env.NODE_ENV = originalNodeEnv;
  });

  it("throws in production when Redis is unavailable", async () => {
    process.env.NODE_ENV = "production";

    await expect(createGoogleOAuthState("user-1")).rejects.toThrow(
      "Google OAuth is unavailable until Redis state storage is configured.",
    );
  });

  it("allows dev fallback encoding when Redis is unavailable", async () => {
    process.env.NODE_ENV = "development";

    const state = await createGoogleOAuthState("user-1");
    const userId = await consumeGoogleOAuthState(state);

    expect(userId).toBe("user-1");
  });

  it("rejects state consumption in production without Redis", async () => {
    process.env.NODE_ENV = "production";
    const encoded = Buffer.from(
      JSON.stringify({ userId: "user-1", createdAt: new Date().toISOString() }),
      "utf8",
    ).toString("base64url");

    await expect(consumeGoogleOAuthState(encoded)).resolves.toBeNull();
  });
});
