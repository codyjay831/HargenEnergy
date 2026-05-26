import { NextRequest, NextResponse } from "next/server";
import { exchangeGoogleOAuthCode } from "@/lib/google-calendar/oauth";
import { consumeGoogleOAuthState } from "@/lib/google-calendar/oauth-state";
import { upsertGoogleCalendarConnection } from "@/lib/google-calendar/token-store";
import { getAppBaseUrl } from "@/lib/app-url";
import { writeAuditLog } from "@/lib/audit-log";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const base = getAppBaseUrl();
  const errorRedirect = `${base}/admin/settings/calendar?error=oauth_failed`;
  const successRedirect = `${base}/admin/settings/calendar?connected=1`;

  const code = request.nextUrl.searchParams.get("code");
  const state = request.nextUrl.searchParams.get("state");
  if (!code || !state) {
    return NextResponse.redirect(errorRedirect);
  }

  const userId = await consumeGoogleOAuthState(state);
  if (!userId) {
    return NextResponse.redirect(errorRedirect);
  }

  try {
    const tokens = await exchangeGoogleOAuthCode(code);
    if (!tokens.refresh_token) {
      return NextResponse.redirect(`${base}/admin/settings/calendar?error=missing_refresh_token`);
    }

    const profileResponse = await fetch("https://www.googleapis.com/oauth2/v2/userinfo", {
      headers: { Authorization: `Bearer ${tokens.access_token}` },
    });
    const profile = (await profileResponse.json()) as { email?: string };
    const googleAccountEmail = profile.email ?? "unknown@gmail.com";

    await upsertGoogleCalendarConnection({
      userId,
      googleAccountEmail,
      accessToken: tokens.access_token,
      refreshToken: tokens.refresh_token,
      expiresInSeconds: tokens.expires_in,
      scopes: tokens.scope,
    });

    await writeAuditLog({
      actorUserId: userId,
      action: "google_calendar.connected",
      entityType: "GoogleCalendarConnection",
      entityId: userId,
      metadata: { googleAccountEmail },
    });

    return NextResponse.redirect(successRedirect);
  } catch {
    return NextResponse.redirect(errorRedirect);
  }
}
