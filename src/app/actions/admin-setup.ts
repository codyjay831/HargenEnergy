"use server";

/**
 * First-admin bootstrap at /setup/admin.
 *
 * Operational: use a high-entropy ADMIN_SETUP_TOKEN, complete setup once, then
 * remove ADMIN_SETUP_TOKEN from the production environment so this surface
 * cannot be retried or leaked from config backups.
 *
 * Never log the setup token or compare result details.
 */

import { redirect } from "next/navigation";
import { z } from "zod";
import bcrypt from "bcryptjs";
import { timingSafeEqual } from "node:crypto";

import { prisma } from "@/lib/prisma";
import { setPasswordSessionStampMs } from "@/lib/password-session-stamp";
import { passwordSchema } from "@/lib/validations";
import { checkRateLimit, getRateLimitIdentifier } from "@/lib/rate-limit";
import { StaffRole } from "@/generated/prisma/client";

const isProd = process.env.NODE_ENV === "production";

const GENERIC_INVALID = "Setup is unavailable or the details provided were not accepted.";
const GENERIC_UNAVAILABLE = "Setup is unavailable right now. Please try again later.";

const setupSchema = z
  .object({
    setupToken: z
      .string()
      .min(1, "Setup token is required")
      .max(256, "Setup token is too long."),
    name: z.string().trim().min(1, "Name is required").max(120),
    email: z.string().email("Invalid email address").transform((v) => v.trim().toLowerCase()),
    password: passwordSchema,
    confirmPassword: z.string().max(72, "Confirmation is too long."),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  });

export type AdminSetupState = {
  error?: string;
  fieldErrors?: Record<string, string[] | undefined>;
};

function safeTokenEqual(provided: string, expected: string): boolean {
  const a = Buffer.from(provided, "utf8");
  const b = Buffer.from(expected, "utf8");
  if (a.length !== b.length) {
    return false;
  }
  try {
    return timingSafeEqual(a, b);
  } catch {
    return false;
  }
}

export async function adminSetupAvailable(): Promise<{
  available: boolean;
  reason?: "already-complete" | "unavailable";
}> {
  if (!process.env.ADMIN_SETUP_TOKEN) {
    return { available: false, reason: "unavailable" };
  }
  try {
    const existing = await prisma.user.count({ where: { role: "ADMIN" } });
    if (existing > 0) {
      return { available: false, reason: "already-complete" };
    }
    return { available: true };
  } catch (error) {
    if (!isProd) {
      console.error("[Admin Setup] Failed to check admin count:", error);
    } else {
      console.warn("[Admin Setup] Failed to check admin count.");
    }
    return { available: false, reason: "unavailable" };
  }
}

export async function createFirstAdminAction(
  _prevState: AdminSetupState | undefined,
  formData: FormData,
): Promise<AdminSetupState> {
  const expectedToken = process.env.ADMIN_SETUP_TOKEN;
  if (!expectedToken) {
    if (!isProd) {
      console.warn("[Admin Setup] ADMIN_SETUP_TOKEN is not set.");
    }
    return { error: GENERIC_UNAVAILABLE };
  }

  const raw = {
    setupToken: String(formData.get("setupToken") ?? ""),
    name: String(formData.get("name") ?? ""),
    email: String(formData.get("email") ?? ""),
    password: String(formData.get("password") ?? ""),
    confirmPassword: String(formData.get("confirmPassword") ?? ""),
  };

  const parsed = setupSchema.safeParse(raw);
  if (!parsed.success) {
    return {
      error: "Please fix the highlighted fields.",
      fieldErrors: parsed.error.flatten().fieldErrors,
    };
  }

  const { setupToken, name, email, password } = parsed.data;

  const rateId = await getRateLimitIdentifier();
  const setupLimit = await checkRateLimit("admin-setup", rateId);
  if (!setupLimit.allowed) {
    return { error: GENERIC_UNAVAILABLE };
  }

  const existingAdmins = await prisma.user.count({ where: { role: "ADMIN" } });
  if (existingAdmins > 0) {
    return { error: GENERIC_INVALID };
  }

  if (!safeTokenEqual(setupToken, expectedToken)) {
    return { error: GENERIC_INVALID };
  }

  let createdRedirect = false;
  try {

    const passwordHash = await bcrypt.hash(password, 12);

    await prisma.$transaction(async (tx) => {
      const stillNoAdmin = await tx.user.count({ where: { role: "ADMIN" } });
      if (stillNoAdmin > 0) {
        throw new Error("ADMIN_ALREADY_EXISTS");
      }

      const existingUser = await tx.user.findUnique({ where: { email } });
      if (existingUser) {
        await tx.user.update({
          where: { email },
          data: {
            name,
            role: "ADMIN",
            staffRole: StaffRole.OWNER,
            clientRole: null,
            clientId: null,
            passwordHash,
            passwordChangedAt: new Date(),
          },
        });
      } else {
        await tx.user.create({
          data: {
            email,
            name,
            passwordHash,
            role: "ADMIN",
            staffRole: StaffRole.OWNER,
            clientRole: null,
            clientId: null,
            passwordChangedAt: new Date(),
          },
        });
      }
    });

    const stampedUser = await prisma.user.findUnique({
      where: { email },
      select: { id: true, passwordChangedAt: true },
    });
    if (stampedUser) {
      await setPasswordSessionStampMs(
        stampedUser.id,
        stampedUser.passwordChangedAt.getTime(),
      );
    }

    createdRedirect = true;
  } catch (error) {
    if (error instanceof Error && error.message === "ADMIN_ALREADY_EXISTS") {
      return { error: GENERIC_INVALID };
    }
    if (!isProd) {
      console.error("[Admin Setup] Error creating first admin:", error);
    } else {
      console.warn("[Admin Setup] Error creating first admin.");
    }
    return { error: GENERIC_UNAVAILABLE };
  }

  if (createdRedirect) {
    redirect("/login?status=setup-complete");
  }

  return {};
}
