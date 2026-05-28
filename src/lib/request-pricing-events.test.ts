import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { logRequestPricingEvent } from "@/lib/request-pricing-events";

describe("logRequestPricingEvent", () => {
  const infoSpy = vi.spyOn(console, "info").mockImplementation(() => {});

  beforeEach(() => {
    infoSpy.mockClear();
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("does not log in test", () => {
    vi.stubEnv("NODE_ENV", "test");
    logRequestPricingEvent({
      type: "request_pricing_set",
      requestId: "req-1",
      clientId: "client-1",
      actorId: "admin-1",
      pricingMode: "FLAT",
      flatPriceCents: 25000,
    });
    expect(infoSpy).not.toHaveBeenCalled();
  });

  it("logs structured payload outside test", () => {
    vi.stubEnv("NODE_ENV", "development");
    logRequestPricingEvent({
      type: "request_pricing_updated",
      requestId: "req-1",
      clientId: "client-1",
      actorId: "admin-1",
      pricingMode: "HOURLY",
      flatPriceCents: null,
    });
    expect(infoSpy).toHaveBeenCalledTimes(1);
    const parsed = JSON.parse(infoSpy.mock.calls[0][1] as string) as Record<string, unknown>;
    expect(parsed.type).toBe("request_pricing_updated");
    expect(parsed.requestId).toBe("req-1");
    expect(typeof parsed.ts).toBe("string");
  });
});
