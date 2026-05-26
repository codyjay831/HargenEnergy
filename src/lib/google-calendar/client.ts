import "server-only";

import { google } from "googleapis";
import { getValidGoogleAccessToken } from "@/lib/google-calendar/token-store";

export async function getGoogleCalendarClient(connectionId: string) {
  const accessToken = await getValidGoogleAccessToken(connectionId);
  const auth = new google.auth.OAuth2();
  auth.setCredentials({ access_token: accessToken });
  return google.calendar({ version: "v3", auth });
}
