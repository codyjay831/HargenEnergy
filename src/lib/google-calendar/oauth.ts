import "server-only";

import { getAppBaseUrl } from "@/lib/app-url";
import { GOOGLE_CALENDAR_SCOPE } from "@/lib/walkthrough-scheduling/constants";

export function getGoogleOAuthRedirectUri(): string {
  const override = process.env.GOOGLE_OAUTH_REDIRECT_URI?.trim();
  if (override) {
    return override;
  }
  return `${getAppBaseUrl()}/api/integrations/google/callback`;
}

export function getGoogleOAuthClientConfig() {
  const clientId = process.env.GOOGLE_CLIENT_ID?.trim();
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET?.trim();
  if (!clientId || !clientSecret) {
    return null;
  }
  return { clientId, clientSecret };
}

export function buildGoogleOAuthAuthorizeUrl(state: string): string {
  const config = getGoogleOAuthClientConfig();
  if (!config) {
    throw new Error("Google OAuth is not configured.");
  }

  const params = new URLSearchParams({
    client_id: config.clientId,
    redirect_uri: getGoogleOAuthRedirectUri(),
    response_type: "code",
    scope: GOOGLE_CALENDAR_SCOPE,
    access_type: "offline",
    prompt: "consent",
    state,
  });

  return `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;
}

export async function exchangeGoogleOAuthCode(code: string) {
  const config = getGoogleOAuthClientConfig();
  if (!config) {
    throw new Error("Google OAuth is not configured.");
  }

  const body = new URLSearchParams({
    code,
    client_id: config.clientId,
    client_secret: config.clientSecret,
    redirect_uri: getGoogleOAuthRedirectUri(),
    grant_type: "authorization_code",
  });

  const response = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body,
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Google token exchange failed: ${text}`);
  }

  return (await response.json()) as {
    access_token: string;
    refresh_token?: string;
    expires_in: number;
    scope?: string;
  };
}

export async function refreshGoogleAccessToken(refreshToken: string) {
  const config = getGoogleOAuthClientConfig();
  if (!config) {
    throw new Error("Google OAuth is not configured.");
  }

  const body = new URLSearchParams({
    refresh_token: refreshToken,
    client_id: config.clientId,
    client_secret: config.clientSecret,
    grant_type: "refresh_token",
  });

  const response = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body,
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Google token refresh failed: ${text}`);
  }

  return (await response.json()) as {
    access_token: string;
    expires_in: number;
    scope?: string;
  };
}

export async function revokeGoogleToken(token: string) {
  await fetch(`https://oauth2.googleapis.com/revoke?token=${encodeURIComponent(token)}`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
  });
}
