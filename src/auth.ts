import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { authConfig } from "./auth.config";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";

export const { auth, signIn, signOut, handlers } = NextAuth({
  ...authConfig,
  providers: [
    Credentials({
      async authorize(credentials) {
        const parsedCredentials = z
          .object({ email: z.string().email(), password: z.string().min(6) })
          .safeParse(credentials);

        if (parsedCredentials.success) {
          const { email, password } = parsedCredentials.data;
          
          try {
            const user = await prisma.user.findUnique({ where: { email } });
            
            if (!user) {
              if (process.env.NODE_ENV === "development") {
                console.log(`[Auth] User not found: ${email}`);
              }
              return null;
            }
            
            const passwordsMatch = await bcrypt.compare(password, user.passwordHash);

            if (passwordsMatch) {
              return user;
            } else {
              if (process.env.NODE_ENV === "development") {
                console.log(`[Auth] Password mismatch for: ${email}`);
              }
            }
          } catch (error) {
            if (process.env.NODE_ENV === "development") {
              console.error("[Auth] Database error during authorize:", error);
            }
            throw error;
          }
        } else {
          if (process.env.NODE_ENV === "development") {
            console.log("[Auth] Invalid credentials format:", parsedCredentials.error.format());
          }
        }

        return null;
      },
    }),
  ],
});

// Extend the built-in session and user types
declare module "next-auth" {
  interface User {
    role?: string;
    clientId?: string | null;
  }
  interface Session {
    user: {
      id: string;
      role: string;
      clientId?: string | null;
    } & DefaultSession["user"];
  }
}

import { DefaultSession } from "next-auth";
