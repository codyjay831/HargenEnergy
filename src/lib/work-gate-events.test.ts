import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { logWorkGateEvent } from "@/lib/work-gate-events";

describe("logWorkGateEvent", () => {
  const infoSpy = vi.spyOn(console, "info").mockImplementation(() => {});

  beforeEach(() => {
    infoSpy.mockClear();
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("does not log in test environment", () => {
    vi.stubEnv("NODE_ENV", "test");
    logWorkGateEvent({
      outcome: "blocked",
      entryPoint: "portal_submit",
      clientId: "client-1",
      reasonCode: "not_active",
    });
    expect(infoSpy).not.toHaveBeenCalled();
  });

  it("logs structured payload outside test", () => {
    vi.stubEnv("NODE_ENV", "development");
    logWorkGateEvent({
      outcome: "allowed",
      entryPoint: "admin_start_timer",
      clientId: "client-1",
      requestId: "req-1",
      actorId: "user-1",
    });

    expect(infoSpy).toHaveBeenCalledTimes(1);
    const logged = infoSpy.mock.calls[0][1] as string;
    const parsed = JSON.parse(logged) as Record<string, unknown>;
    expect(parsed.outcome).toBe("allowed");
    expect(parsed.entryPoint).toBe("admin_start_timer");
    expect(parsed.clientId).toBe("client-1");
    expect(typeof parsed.ts).toBe("string");
  });
});
