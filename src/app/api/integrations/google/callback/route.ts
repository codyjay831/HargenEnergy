import { NextRequest, NextResponse } from "next/server";
import { exchangeGoogleOAuthCode } from "@/lib/google-calendar/oauth";
import { consumeGoogleOAuthState } from "@/lib/google-calendar/oauth-state";
import { upsertGoogleCalendarConnection } from "@/lib/google-calendar/token-store";
import { listGoogleCalendars } from "@/lib/google-calendar/events";
import { prisma } from "@/lib/prisma";
import { getAppBaseUrl } from "@/lib/app-url";
import { writeAuditLog } from "@/lib/audit-log";

export const dynamic = "force-dynamic";

type CallbackErrorCode =
  | "oauth_failed"
  | "oauth_denied"
  | "oauth_missing_params"
  | "oauth_state_invalid"
  | "oauth_token_exchange"
  | "missing_refresh_token"
  | "oauth_storage";

function logCallbackError(stage: string, detail?: Record<string, unknown>) {
  console.error("[google-oauth-callback]", stage, detail ?? {});
}

function buildRedirect(base: string, code: CallbackErrorCode | "connected"): string {
  if (code === "connected") {
    return `${base}/admin/settings/calendar?connected=1`;
  }
  return `${base}/admin/settings/calendar?error=${code}`;
}

export async function GET(request: NextRequest) {
  const base = getAppBaseUrl();
  const googleError = request.nextUrl.searchParams.get("error");
  const code = request.nextUrl.searchParams.get("code");
  const state = request.nextUrl.searchParams.get("state");

  if (googleError) {
    logCallbackError("google_returned_error", { googleError });
    const mapped: CallbackErrorCode =
      googleError === "access_denied" ? "oauth_denied" : "oauth_failed";
    return NextResponse.redirect(buildRedirect(base, mapped));
  }

  if (!code || !state) {
    logCallbackError("missing_code_or_state", { hasCode: Boolean(code), hasState: Boolean(state) });
    return NextResponse.redirect(buildRedirect(base, "oauth_missing_params"));
  }

  const userId = await consumeGoogleOAuthState(state);
  if (!userId) {
    logCallbackError("invalid_oauth_state", { statePrefix: state.slice(0, 6) });
    return NextResponse.redirect(buildRedirect(base, "oauth_state_invalid"));
  }

  let tokens;
  try {
    tokens = await exchangeGoogleOAuthCode(code);
  } catch (error) {
    logCallbackError("token_exchange_failed", {
      message: error instanceof Error ? error.message : String(error),
    });
    return NextResponse.redirect(buildRedirect(base, "oauth_token_exchange"));
  }

  if (!tokens.refresh_token) {
    logCallbackError("missing_refresh_token", { hasAccessToken: Boolean(tokens.access_token) });
    return NextResponse.redirect(buildRedirect(base, "missing_refresh_token"));
  }

  let googleAccountEmail = "unknown@gmail.com";
  try {
    const profileResponse = await fetch("https://www.googleapis.com/oauth2/v2/userinfo", {
      headers: { Authorization: `Bearer ${tokens.access_token}` },
    });
    if (profileResponse.ok) {
      const profile = (await profileResponse.json()) as { email?: string };
      if (profile.email) {
        googleAccountEmail = profile.email;
      }
    } else {
      logCallbackError("userinfo_non_ok", { status: profileResponse.status });
    }
  } catch (error) {
    logCallbackError("userinfo_fetch_failed", {
      message: error instanceof Error ? error.message : String(error),
    });
  }

  let connection;
  try {
    connection = await upsertGoogleCalendarConnection({
      userId,
      googleAccountEmail,
      accessToken: tokens.access_token,
      refreshToken: tokens.refresh_token,
      expiresInSeconds: tokens.expires_in,
      scopes: tokens.scope,
    });
  } catch (error) {
    logCallbackError("connection_upsert_failed", {
      message: error instanceof Error ? error.message : String(error),
    });
    return NextResponse.redirect(buildRedirect(base, "oauth_storage"));
  }

  // Auto-select a booking calendar when there's only one or a clear primary.
  // Skip if user already has one selected (a Reconnect should not overwrite their choice).
  if (!connection.calendarId) {
    try {
      const calendars = await listGoogleCalendars(connection.id);
      const auto =
        calendars.find((item) => item.primary) ??
        (calendars.length === 1 ? calendars[0] : null);
      if (auto) {
        await prisma.googleCalendarConnection.update({
          where: { id: connection.id },
          data: { calendarId: auto.id, calendarName: auto.summary },
        });
        await writeAuditLog({
          actorUserId: userId,
          action: "google_calendar.calendar_auto_selected",
          entityType: "GoogleCalendarConnection",
          entityId: connection.id,
          metadata: { calendarId: auto.id, calendarName: auto.summary },
        });
      }
    } catch (error) {
      // Non-fatal: connection succeeded, user can still pick a calendar manually.
      logCallbackError("calendar_autoselect_failed", {
        message: error instanceof Error ? error.message : String(error),
      });
    }
  }

  await writeAuditLog({
    actorUserId: userId,
    action: "google_calendar.connected",
    entityType: "GoogleCalendarConnection",
    entityId: userId,
    metadata: { googleAccountEmail },
  });

  return NextResponse.redirect(buildRedirect(base, "connected"));
}
