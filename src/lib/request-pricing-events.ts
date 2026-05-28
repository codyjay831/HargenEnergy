import type { PricingMode } from "@/generated/prisma/client";

export type RequestPricingEventType =
  | "request_pricing_set"
  | "request_pricing_updated"
  | "request_pricing_cleared";

export type RequestPricingEvent = {
  type: RequestPricingEventType;
  requestId: string;
  clientId: string;
  actorId: string;
  pricingMode: PricingMode | null;
  flatPriceCents: number | null;
  ts: string;
};

export function logRequestPricingEvent(
  event: Omit<RequestPricingEvent, "ts">,
): void {
  if (process.env.NODE_ENV === "test") {
    return;
  }

  const payload: RequestPricingEvent = {
    ...event,
    ts: new Date().toISOString(),
  };

  console.info("[request-pricing]", JSON.stringify(payload));
}
