import "server-only";

import { createHash, randomBytes } from "node:crypto";
import { addDays } from "date-fns";
import { DISCOVERY_SCHEDULING_LINK_TTL_DAYS } from "@/lib/discovery-scheduling/constants";
import { getAppBaseUrl } from "@/lib/app-url";

export function hashSchedulingToken(rawToken: string): string {
  return createHash("sha256").update(rawToken).digest("hex");
}

export function createSchedulingRawToken(): string {
  return randomBytes(32).toString("base64url");
}

export function buildSchedulingLinkExpiry(from: Date = new Date()): Date {
  return addDays(from, DISCOVERY_SCHEDULING_LINK_TTL_DAYS);
}

export function buildDiscoverySchedulingUrl(rawToken: string): string {
  return `${getAppBaseUrl()}/schedule/discovery/${encodeURIComponent(rawToken)}`;
}

export function isSchedulingLinkExpired(expiresAt: Date, now: Date = new Date()): boolean {
  return expiresAt.getTime() <= now.getTime();
}
