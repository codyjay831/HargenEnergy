import "server-only";

import { createHash, randomBytes } from "node:crypto";
import { addDays } from "date-fns";
import { AGREEMENT_SIGNING_LINK_TTL_DAYS } from "@/lib/agreements/constants";
import { getAppBaseUrl } from "@/lib/app-url";

export function hashSigningToken(rawToken: string): string {
  return createHash("sha256").update(rawToken).digest("hex");
}

export function createSigningRawToken(): string {
  return randomBytes(32).toString("base64url");
}

export function buildSigningLinkExpiry(from: Date = new Date()): Date {
  return addDays(from, AGREEMENT_SIGNING_LINK_TTL_DAYS);
}

export function buildAgreementSigningUrl(rawToken: string): string {
  return `${getAppBaseUrl()}/agreements/sign/${encodeURIComponent(rawToken)}`;
}

export function isSigningLinkExpired(expiresAt: Date, now: Date = new Date()): boolean {
  return expiresAt.getTime() <= now.getTime();
}
