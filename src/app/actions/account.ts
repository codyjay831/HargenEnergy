"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import bcrypt from "bcryptjs";

import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { passwordSchema } from "@/lib/validations";

const isProd = process.env.NODE_ENV === "production";

export type ChangePasswordState = {
  error?: string;
  success?: string;
  fieldErrors?: Record<string, string[] | undefined>;
};

const changePasswordSchema = z
  .object({
    currentPassword: z
      .string()
      .min(1, "Current password is required")
      .max(2048, "Current password is too long."),
    password: passwordSchema,
    confirmPassword: z.string().max(72, "Confirmation is too long."),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  });

export async function changeOwnPasswordAction(
  _prevState: ChangePasswordState | undefined,
  formData: FormData,
): Promise<ChangePasswordState> {
  const session = await auth();
  if (!session?.user?.id) {
    return { error: "You must be signed in to change your password." };
  }

  const parsed = changePasswordSchema.safeParse({
    currentPassword: String(formData.get("currentPassword") ?? ""),
    password: String(formData.get("password") ?? ""),
    confirmPassword: String(formData.get("confirmPassword") ?? ""),
  });

  if (!parsed.success) {
    return {
      error: "Please fix the highlighted fields.",
      fieldErrors: parsed.error.flatten().fieldErrors,
    };
  }

  const { currentPassword, password } = parsed.data;

  try {
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
    });
    if (!user) {
      return { error: "Account not found." };
    }

    const ok = await bcrypt.compare(currentPassword, user.passwordHash);
    if (!ok) {
      return {
        error: "Current password is incorrect.",
        fieldErrors: { currentPassword: ["Current password is incorrect."] },
      };
    }

    const passwordHash = await bcrypt.hash(password, 12);
    await prisma.user.update({
      where: { id: user.id },
      data: { passwordHash },
    });

    revalidatePath("/admin/account");
    return { success: "Password updated successfully." };
  } catch (error) {
    if (!isProd) {
      console.error("[Account] changeOwnPassword error:", error);
    } else {
      console.warn("[Account] changeOwnPassword error.");
    }
    return { error: "Could not update password. Please try again." };
  }
}
