import NextAuth, { type DefaultSession } from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { authConfig } from "./auth.config";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";

const isProd = process.env.NODE_ENV === "production";

if (isProd && !process.env.AUTH_SECRET) {
  throw new Error("AUTH_SECRET is required in production.");
}

export const { auth, signIn, signOut, handlers } = NextAuth({
  ...authConfig,
  providers: [
    Credentials({
      async authorize(credentials) {
        const parsedCredentials = z
          .object({ email: z.string().email(), password: z.string().min(1) })
          .safeParse(credentials);

        if (!parsedCredentials.success) {
          if (!isProd) {
            console.log(
              "[Auth] Invalid credentials format:",
              parsedCredentials.error.format(),
            );
          }
          return null;
        }

        const { email, password } = parsedCredentials.data;

        try {
          const user = await prisma.user.findUnique({ where: { email } });

          if (!user) {
            if (!isProd) {
              console.log(`[Auth] User not found: ${email}`);
            }
            return null;
          }

          const passwordsMatch = await bcrypt.compare(password, user.passwordHash);

          if (!passwordsMatch) {
            if (!isProd) {
              console.log(`[Auth] Password mismatch for: ${email}`);
            }
            return null;
          }

          return {
            id: user.id,
            email: user.email,
            name: user.name,
            role: user.role,
            clientId: user.clientId,
          };
        } catch (error) {
          if (!isProd) {
            console.error("[Auth] Database error during authorize:", error);
          } else {
            console.warn("[Auth] Authentication service error.");
          }
          return null;
        }
      },
    }),
  ],
});

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
