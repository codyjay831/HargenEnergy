import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { buildGoogleOAuthAuthorizeUrl } from "@/lib/google-calendar/oauth";
import { createGoogleOAuthState } from "@/lib/google-calendar/oauth-state";

export const dynamic = "force-dynamic";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id || session.user.role !== "ADMIN") {
    return NextResponse.redirect(new URL("/login", process.env.APP_URL || "http://localhost:3000"));
  }

  try {
    const state = await createGoogleOAuthState(session.user.id);
    const url = buildGoogleOAuthAuthorizeUrl(state);
    return NextResponse.redirect(url);
  } catch {
    return NextResponse.redirect(
      new URL("/admin/settings/calendar?error=oauth_not_configured", process.env.APP_URL || "http://localhost:3000"),
    );
  }
}
