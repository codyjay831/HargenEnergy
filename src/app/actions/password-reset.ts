"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import bcrypt from "bcryptjs";
import { createHash, randomBytes } from "node:crypto";

import { prisma } from "@/lib/prisma";
import { sendPasswordResetEmail } from "@/lib/email";
import { passwordSchema } from "@/lib/validations";
import { checkRateLimit, getRateLimitIdentifier } from "@/lib/rate-limit";

const isProd = process.env.NODE_ENV === "production";

const RESET_TOKEN_TTL_MINUTES = 30;

const GENERIC_FORGOT_SUCCESS =
  "If an account exists for that email, a reset link has been sent.";

const GENERIC_RESET_INVALID =
  "This reset link is invalid or has expired. Please request a new one.";

export type ForgotPasswordState = {
  message?: string;
  kind?: "success" | "error";
};

export type ResetPasswordState = {
  error?: string;
  fieldErrors?: Record<string, string[] | undefined>;
};

const forgotSchema = z.object({
  email: z
    .string()
    .max(254, "Email must be at most 254 characters.")
    .email("Invalid email address")
    .transform((v) => v.trim().toLowerCase()),
});

const resetSchema = z
  .object({
    token: z
      .string()
      .min(1, "Reset token is required")
      .max(128, "Reset token is too long."),
    password: passwordSchema,
    confirmPassword: z.string().max(72, "Confirmation is too long."),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  });

function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

function getAppUrl(): string {
  return (
    process.env.APP_URL ||
    process.env.NEXT_PUBLIC_APP_URL ||
    "http://localhost:3000"
  );
}

export async function requestPasswordResetAction(
  _prevState: ForgotPasswordState | undefined,
  formData: FormData,
): Promise<ForgotPasswordState> {
  const parsed = forgotSchema.safeParse({
    email: String(formData.get("email") ?? ""),
  });

  if (!parsed.success) {
    return {
      kind: "success",
      message: GENERIC_FORGOT_SUCCESS,
    };
  }

  const rateId = await getRateLimitIdentifier();
  const resetReqLimit = await checkRateLimit("password-reset-request", rateId);
  if (!resetReqLimit.allowed) {
    return { kind: "success", message: GENERIC_FORGOT_SUCCESS };
  }

  const { email } = parsed.data;

  try {
    const user = await prisma.user.findUnique({ where: { email } });

    if (user) {
      const rawToken = randomBytes(32).toString("hex");
      const tokenHash = hashToken(rawToken);
      const expiresAt = new Date(
        Date.now() + RESET_TOKEN_TTL_MINUTES * 60 * 1000,
      );

      await prisma.passwordResetToken.create({
        data: {
          userId: user.id,
          tokenHash,
          expiresAt,
        },
      });

      const resetUrl = `${getAppUrl().replace(/\/$/, "")}/reset-password?token=${rawToken}`;

      const result = await sendPasswordResetEmail({
        to: user.email,
        resetUrl,
        expiresInMinutes: RESET_TOKEN_TTL_MINUTES,
      });

      if ("error" in result && result.error) {
        if (!isProd) {
          console.warn(
            "[Password Reset] Email send failed for user:",
            user.email,
          );
        } else {
          console.warn(
            "[Password Reset] Email send failed (provider unavailable).",
          );
        }
      }
    }
  } catch (error) {
    if (!isProd) {
      console.error("[Password Reset] requestPasswordReset error:", error);
    } else {
      console.warn("[Password Reset] requestPasswordReset error.");
    }
  }

  return { kind: "success", message: GENERIC_FORGOT_SUCCESS };
}

export async function isResetTokenValid(token: string): Promise<boolean> {
  if (!token) return false;
  try {
    const tokenHash = hashToken(token);
    const record = await prisma.passwordResetToken.findUnique({
      where: { tokenHash },
    });
    if (!record) return false;
    if (record.usedAt) return false;
    if (record.expiresAt.getTime() < Date.now()) return false;
    return true;
  } catch (error) {
    if (!isProd) {
      console.error("[Password Reset] isResetTokenValid error:", error);
    }
    return false;
  }
}

export async function resetPasswordAction(
  _prevState: ResetPasswordState | undefined,
  formData: FormData,
): Promise<ResetPasswordState> {
  const raw = {
    token: String(formData.get("token") ?? ""),
    password: String(formData.get("password") ?? ""),
    confirmPassword: String(formData.get("confirmPassword") ?? ""),
  };

  const parsed = resetSchema.safeParse(raw);
  if (!parsed.success) {
    return {
      error: "Please fix the highlighted fields.",
      fieldErrors: parsed.error.flatten().fieldErrors,
    };
  }

  const rateId = await getRateLimitIdentifier();
  const resetCompleteLimit = await checkRateLimit(
    "password-reset-complete",
    rateId,
  );
  if (!resetCompleteLimit.allowed) {
    return { error: "Could not update password. Please try again later." };
  }

  const { token, password } = parsed.data;
  const tokenHash = hashToken(token);

  let success = false;
  try {
    const record = await prisma.passwordResetToken.findUnique({
      where: { tokenHash },
    });

    if (!record || record.usedAt || record.expiresAt.getTime() < Date.now()) {
      return { error: GENERIC_RESET_INVALID };
    }

    const passwordHash = await bcrypt.hash(password, 12);

    await prisma.$transaction(async (tx) => {
      const fresh = await tx.passwordResetToken.findUnique({
        where: { tokenHash },
      });
      if (!fresh || fresh.usedAt || fresh.expiresAt.getTime() < Date.now()) {
        throw new Error("RESET_TOKEN_INVALID");
      }
      await tx.user.update({
        where: { id: fresh.userId },
        data: { passwordHash },
      });
      await tx.passwordResetToken.update({
        where: { tokenHash },
        data: { usedAt: new Date() },
      });
      // Invalidate other outstanding tokens for this user.
      await tx.passwordResetToken.updateMany({
        where: {
          userId: fresh.userId,
          usedAt: null,
          tokenHash: { not: tokenHash },
        },
        data: { usedAt: new Date() },
      });
    });

    success = true;
  } catch (error) {
    if (error instanceof Error && error.message === "RESET_TOKEN_INVALID") {
      return { error: GENERIC_RESET_INVALID };
    }
    if (!isProd) {
      console.error("[Password Reset] resetPassword error:", error);
    } else {
      console.warn("[Password Reset] resetPassword error.");
    }
    return { error: "Could not update password. Please try again." };
  }

  if (success) {
    redirect("/login?status=password-updated");
  }

  return {};
}
