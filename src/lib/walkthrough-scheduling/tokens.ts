import "server-only";

import { createHash, randomBytes } from "node:crypto";
import { addDays } from "date-fns";
import { WALKTHROUGH_SCHEDULING_LINK_TTL_DAYS } from "@/lib/walkthrough-scheduling/constants";
import { getAppBaseUrl } from "@/lib/app-url";

export function hashSchedulingToken(rawToken: string): string {
  return createHash("sha256").update(rawToken).digest("hex");
}

export function createSchedulingRawToken(): string {
  return randomBytes(32).toString("base64url");
}

export function buildSchedulingLinkExpiry(from: Date = new Date()): Date {
  return addDays(from, WALKTHROUGH_SCHEDULING_LINK_TTL_DAYS);
}

export function buildWalkthroughSchedulingUrl(rawToken: string): string {
  return `${getAppBaseUrl()}/schedule/walkthrough/${encodeURIComponent(rawToken)}`;
}

export function isSchedulingLinkExpired(expiresAt: Date, now: Date = new Date()): boolean {
  return expiresAt.getTime() <= now.getTime();
}
