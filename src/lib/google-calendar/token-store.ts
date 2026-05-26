import "server-only";

import {
  GoogleCalendarConnectionStatus,
} from "@/generated/prisma/client";
import {
  decryptFieldValue,
  encryptFieldValue,
} from "@/lib/crypto/field-encryption";
import { refreshGoogleAccessToken, revokeGoogleToken } from "@/lib/google-calendar/oauth";
import { GOOGLE_CALENDAR_SCOPE } from "@/lib/walkthrough-scheduling/constants";
import { prisma } from "@/lib/prisma";

export async function upsertGoogleCalendarConnection(input: {
  userId: string;
  googleAccountEmail: string;
  accessToken: string;
  refreshToken: string;
  expiresInSeconds: number;
  scopes?: string;
}) {
  const accessTokenExpiresAt = new Date(Date.now() + input.expiresInSeconds * 1000);

  return prisma.googleCalendarConnection.upsert({
    where: { userId: input.userId },
    create: {
      userId: input.userId,
      googleAccountEmail: input.googleAccountEmail,
      encryptedAccessToken: encryptFieldValue(input.accessToken)!,
      encryptedRefreshToken: encryptFieldValue(input.refreshToken)!,
      accessTokenExpiresAt,
      scopes: input.scopes ?? GOOGLE_CALENDAR_SCOPE,
      status: GoogleCalendarConnectionStatus.CONNECTED,
    },
    update: {
      googleAccountEmail: input.googleAccountEmail,
      encryptedAccessToken: encryptFieldValue(input.accessToken)!,
      encryptedRefreshToken: encryptFieldValue(input.refreshToken)!,
      accessTokenExpiresAt,
      scopes: input.scopes ?? GOOGLE_CALENDAR_SCOPE,
      status: GoogleCalendarConnectionStatus.CONNECTED,
      lastSyncError: null,
    },
  });
}

export async function getActiveGoogleCalendarConnection() {
  return prisma.googleCalendarConnection.findFirst({
    where: { status: GoogleCalendarConnectionStatus.CONNECTED },
    orderBy: { updatedAt: "desc" },
  });
}

export async function getValidGoogleAccessToken(connectionId: string): Promise<string> {
  const connection = await prisma.googleCalendarConnection.findUnique({
    where: { id: connectionId },
  });
  if (!connection) {
    throw new Error("Google Calendar connection not found.");
  }

  const refreshThreshold = new Date(Date.now() + 5 * 60 * 1000);
  if (connection.accessTokenExpiresAt > refreshThreshold) {
    return decryptFieldValue(connection.encryptedAccessToken)!;
  }

  const refreshToken = decryptFieldValue(connection.encryptedRefreshToken);
  if (!refreshToken) {
    throw new Error("Missing Google refresh token.");
  }

  try {
    const refreshed = await refreshGoogleAccessToken(refreshToken);
    const accessTokenExpiresAt = new Date(Date.now() + refreshed.expires_in * 1000);
    await prisma.googleCalendarConnection.update({
      where: { id: connection.id },
      data: {
        encryptedAccessToken: encryptFieldValue(refreshed.access_token)!,
        accessTokenExpiresAt,
        status: GoogleCalendarConnectionStatus.CONNECTED,
        lastSyncError: null,
      },
    });
    return refreshed.access_token;
  } catch (error) {
    await prisma.googleCalendarConnection.update({
      where: { id: connection.id },
      data: {
        status: GoogleCalendarConnectionStatus.TOKEN_EXPIRED,
        lastSyncError: error instanceof Error ? error.message : "Token refresh failed",
      },
    });
    throw error;
  }
}

export async function disconnectGoogleCalendarConnection(userId: string) {
  const connection = await prisma.googleCalendarConnection.findUnique({
    where: { userId },
  });
  if (!connection) {
    return;
  }

  const refreshToken = decryptFieldValue(connection.encryptedRefreshToken);
  if (refreshToken) {
    try {
      await revokeGoogleToken(refreshToken);
    } catch {
      // Best effort revoke
    }
  }

  await prisma.googleCalendarConnection.delete({ where: { userId } });
}
