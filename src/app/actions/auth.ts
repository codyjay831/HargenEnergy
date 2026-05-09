"use server";

import { signIn, signOut } from "@/auth";
import { AuthError } from "next-auth";

export async function authenticate(
  prevState: string | undefined,
  formData: FormData,
) {
  try {
    await signIn("credentials", formData);
  } catch (error) {
    if (error instanceof AuthError) {
      if (process.env.NODE_ENV === "development") {
        console.error("[Auth Action] AuthError:", error.type, error.message);
      }
      switch (error.type) {
        case "CredentialsSignin":
          return "Invalid email or password.";
        case "CallbackRouteError":
          return "Authentication service error. Please check server logs.";
        default:
          return "Something went wrong with authentication.";
      }
    }
    
    // Next.js redirect throws an error, we should rethrow it
    if (error instanceof Error && error.message === "NEXT_REDIRECT") {
      throw error;
    }

    if (process.env.NODE_ENV === "development") {
      console.error("[Auth Action] Unexpected error:", error);
    }
    
    return "An unexpected error occurred. Please try again.";
  }
}

export async function handleSignOut() {
  await signOut({ redirectTo: "/" });
}
