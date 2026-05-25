"use server";

import { signIn, signOut } from "@/auth";
import { AuthError } from "next-auth";

import { checkRateLimit, getRateLimitIdentifier } from "@/lib/rate-limit";

const isProd = process.env.NODE_ENV === "production";

function isNextRedirect(error: unknown): boolean {
  if (typeof error !== "object" || error === null) {
    return false;
  }
  const digest =
    "digest" in error ? String((error as { digest?: unknown }).digest) : "";
  if (digest.startsWith("NEXT_REDIRECT")) {
    return true;
  }
  return error instanceof Error && error.message === "NEXT_REDIRECT";
}

export async function authenticate(
  prevState: string | undefined,
  formData: FormData,
) {
  const rateId = await getRateLimitIdentifier();
  const loginLimit = await checkRateLimit("login", rateId);
  if (!loginLimit.allowed) {
    return "Invalid email or password.";
  }

  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const password = String(formData.get("password") ?? "");

  try {
    await signIn("credentials", {
      email,
      password,
      // Middleware on /login redirects admins → /admin, clients → /portal.
      redirectTo: "/login",
    });
  } catch (error) {
    if (isNextRedirect(error)) {
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
