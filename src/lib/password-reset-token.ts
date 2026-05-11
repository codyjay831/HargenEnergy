import "server-only";

import { createHash, randomBytes } from "node:crypto";

import { prisma } from "@/lib/prisma";

export const RESET_TOKEN_TTL_MINUTES = 30;

function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

export async function createPasswordResetTokenForUser(
  userId: string,
): Promise<string> {
  const rawToken = randomBytes(32).toString("hex");
  const tokenHash = hashToken(rawToken);
  const expiresAt = new Date(
    Date.now() + RESET_TOKEN_TTL_MINUTES * 60 * 1000,
  );

  await prisma.passwordResetToken.create({
    data: {
      userId,
      tokenHash,
      expiresAt,
    },
  });

  return rawToken;
}

export function buildPasswordResetUrl(rawToken: string): string {
  const base =
    process.env.APP_URL ||
    process.env.NEXT_PUBLIC_APP_URL ||
    "http://localhost:3000";
  return `${base.replace(/\/$/, "")}/reset-password?token=${rawToken}`;
}
