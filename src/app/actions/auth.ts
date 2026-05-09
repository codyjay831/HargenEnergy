"use server";

import { signIn, signOut } from "@/auth";
import { AuthError } from "next-auth";

import { checkRateLimit, getRateLimitIdentifier } from "@/lib/rate-limit";

const isProd = process.env.NODE_ENV === "production";

export async function authenticate(
  prevState: string | undefined,
  formData: FormData,
) {
  const rateId = await getRateLimitIdentifier();
  const loginLimit = await checkRateLimit("login", rateId);
  if (!loginLimit.allowed) {
    return "Invalid email or password.";
  }

  try {
    await signIn("credentials", formData);
  } catch (error) {
    if (error instanceof Error && error.message === "NEXT_REDIRECT") {
      throw error;
    }

    if (error instanceof AuthError) {
      if (!isProd) {
        console.error("[Auth Action] AuthError:", error.type, error.message);
      }
      switch (error.type) {
        case "CredentialsSignin":
          return "Invalid email or password.";
        case "CallbackRouteError":
          return "Authentication service unavailable. Please try again shortly.";
        default:
          return "Authentication service unavailable. Please try again shortly.";
      }
    }

    if (!isProd) {
      console.error("[Auth Action] Unexpected error:", error);
    } else {
      console.warn("[Auth Action] Unexpected sign-in error.");
    }

    return "Authentication service unavailable. Please try again shortly.";
  }
}

export async function handleSignOut() {
  await signOut({ redirectTo: "/" });
}
