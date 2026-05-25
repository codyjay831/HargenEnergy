import NextAuth, { type DefaultSession } from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { authConfig } from "./auth.config";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";

const isProd = process.env.NODE_ENV === "production";

/** bcrypt cost-12 hash of `__timing_pad__` — compared when email is unknown to reduce timing skew vs wrong-password path. */
const LOGIN_DUMMY_PASSWORD_HASH =
  "$2b$12$3EmpU5w7F36D6vG8TvftLu5spg5zn32epCtFabJyFaHiLB0VMRzBq";

if (isProd && !process.env.AUTH_SECRET) {
  throw new Error("AUTH_SECRET is required in production.");
}

export const { auth, signIn, signOut, handlers } = NextAuth({
  ...authConfig,
  callbacks: {
    ...authConfig.callbacks,
    async jwt(params) {
      const baseJwt = authConfig.callbacks.jwt;
      if (!baseJwt) {
        return params.token;
      }
      let token = await baseJwt(params);
      if (!token || params.user) {
        return token;
      }

      // Node-only: refresh deactivation and roles from DB (Prisma cannot run in Edge middleware).
      if (token.id) {
        try {
          const current = await prisma.user.findUnique({
            where: { id: token.id as string },
            select: {
              deactivatedAt: true,
              staffRole: true,
              clientRole: true,
              role: true,
            },
          });
          if (!current || current.deactivatedAt) {
            return null;
          }
          token.staffRole = current.staffRole ?? null;
          token.clientRole = current.clientRole ?? null;
          token.role = current.role;
          token.deactivatedAt = null;
          if (current.role === "ADMIN" && !current.staffRole) {
            return null;
          }
          if (current.role === "CLIENT" && !current.clientRole) {
            return null;
          }
        } catch (error) {
          if (!isProd) {
            console.error("[Auth] Failed user role/deactivation refresh:", error);
          } else {
            console.warn("[Auth] Failed user role/deactivation refresh.");
          }
          return null;
        }
      }

      return token;
    },
  },
  providers: [
    Credentials({
      async authorize(credentials) {
        const parsedCredentials = z
          .object({
            email: z
              .string()
              .email()
              .transform((v) => v.trim().toLowerCase()),
            password: z.string().min(1),
          })
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
            await bcrypt.compare(password, LOGIN_DUMMY_PASSWORD_HASH);
            return null;
          }

          if (user.deactivatedAt) {
            await bcrypt.compare(password, LOGIN_DUMMY_PASSWORD_HASH);
            return null;
          }

          const passwordsMatch = await bcrypt.compare(password, user.passwordHash);

          if (!passwordsMatch) {
            return null;
          }

          await prisma.user.update({
            where: { id: user.id },
            data: { lastLoginAt: new Date() },
          });

          return {
            id: user.id,
            email: user.email,
            name: user.name,
            role: user.role,
            clientId: user.clientId,
            staffRole: user.staffRole,
            clientRole: user.clientRole,
            deactivatedAt: user.deactivatedAt,
            passwordChangedAt: user.passwordChangedAt,
            createdAt: user.createdAt,
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
    staffRole?: "OWNER" | "MEMBER" | null;
    clientRole?: "OWNER" | "MEMBER" | null;
    deactivatedAt?: Date | null;
    passwordChangedAt?: Date;
    createdAt?: Date;
  }
  interface Session {
    user: {
      id: string;
      role: string;
      clientId?: string | null;
      staffRole?: "OWNER" | "MEMBER" | null;
      clientRole?: "OWNER" | "MEMBER" | null;
    } & DefaultSession["user"];
  }
}

declare module "@auth/core/jwt" {
  interface JWT {
    id?: string;
    role?: string;
    clientId?: string | null;
    staffRole?: "OWNER" | "MEMBER" | null;
    clientRole?: "OWNER" | "MEMBER" | null;
    deactivatedAt?: number | null;
    /** Epoch ms of `User.passwordChangedAt` when the JWT was issued. */
    passwordChangedAt?: number;
  }
}
