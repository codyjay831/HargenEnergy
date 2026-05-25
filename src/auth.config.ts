import type { NextAuthConfig } from "next-auth";

import {
  getPasswordSessionStampMs,
  hasUpstashCredentials,
  setPasswordSessionStampMs,
} from "./lib/password-session-stamp";

function passwordStampMsFromUser(user: {
  passwordChangedAt?: Date | string | null;
  createdAt?: Date | string | null;
}): number {
  const p = user.passwordChangedAt;
  if (p instanceof Date) return p.getTime();
  if (typeof p === "string" && p.length > 0) return new Date(p).getTime();
  const c = user.createdAt;
  if (c instanceof Date) return c.getTime();
  if (typeof c === "string" && c.length > 0) return new Date(c).getTime();
  return Date.now();
}

async function getLatestPasswordStampMs(userId: string): Promise<number | null> {
  const cached = await getPasswordSessionStampMs(userId);
  if (cached != null) {
    return cached;
  }

  // In production, a missing Redis backend can otherwise disable cross-instance
  // password-change revocation checks. Fall back to a direct DB read here.
  if (process.env.NODE_ENV === "production" && !hasUpstashCredentials()) {
    try {
      const { prisma } = await import("@/lib/prisma");
      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { passwordChangedAt: true },
      });
      return user?.passwordChangedAt?.getTime() ?? null;
    } catch (error) {
      console.error("[Auth Config] Failed password stamp DB fallback:", error);
      return null;
    }
  }

  return null;
}

export const authConfig = {
  pages: {
    signIn: "/login",
  },
  callbacks: {
    authorized({ auth, request: { nextUrl } }) {
      const isLoggedIn = !!auth?.user;
      const isAdminRoute = nextUrl.pathname.startsWith("/admin");
      const isPortalRoute = nextUrl.pathname.startsWith("/portal");
      const isLoginPage = nextUrl.pathname === "/login";
      
      if (process.env.NODE_ENV === "development") {
        console.log(`[Auth Config] Path: ${nextUrl.pathname}, LoggedIn: ${isLoggedIn}, Role: ${auth?.user?.role}`);
      }

      if (isAdminRoute) {
        if (isLoggedIn && auth.user.role === "ADMIN") return true;
        return false; // Redirect to login
      }

      if (isPortalRoute) {
        if (isLoggedIn) return true;
        return false; // Redirect to login
      }

      if (isLoginPage && isLoggedIn) {
        if (auth.user.role === "ADMIN") {
          return Response.redirect(new URL("/admin", nextUrl));
        }
        return Response.redirect(new URL("/portal", nextUrl));
      }

      return true;
    },
    async jwt({ token, user }) {
      if (user) {
        const u = user as {
          id: string;
          role?: string;
          clientId?: string | null;
          staffRole?: "OWNER" | "MEMBER" | null;
          clientRole?: "OWNER" | "MEMBER" | null;
          deactivatedAt?: Date | string | null;
          passwordChangedAt?: Date | string | null;
          createdAt?: Date | string | null;
        };
        token.id = u.id;
        token.role = u.role;
        token.clientId = u.clientId ?? null;
        token.staffRole = u.staffRole ?? null;
        token.clientRole = u.clientRole ?? null;
        token.deactivatedAt =
          u.deactivatedAt instanceof Date
            ? u.deactivatedAt.getTime()
            : typeof u.deactivatedAt === "string" && u.deactivatedAt.length > 0
              ? new Date(u.deactivatedAt).getTime()
              : null;
        const stampMs = passwordStampMsFromUser(u);
        token.passwordChangedAt = stampMs;
        await setPasswordSessionStampMs(u.id, stampMs);
        return token;
      }

      if (token?.id) {
        if (token.deactivatedAt != null) {
          return null;
        }

        try {
          const { prisma } = await import("@/lib/prisma");
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
          if (current.role === "ADMIN" && !current.staffRole) {
            return null;
          }
          if (current.role === "CLIENT" && !current.clientRole) {
            return null;
          }
        } catch (error) {
          console.error("[Auth Config] Failed user role/deactivation check:", error);
          return null;
        }
        if (token.passwordChangedAt == null) {
          return null;
        }
        const stamped =
          typeof token.passwordChangedAt === "number"
            ? token.passwordChangedAt
            : parseInt(String(token.passwordChangedAt), 10);
        if (Number.isNaN(stamped)) {
          return null;
        }
        const latest = await getLatestPasswordStampMs(token.id as string);
        if (latest != null && latest > stamped) {
          return null;
        }
      }
      return token;
    },
    session({ session, token }) {
      if (token && session.user) {
        session.user.id = token.id as string;
        session.user.role = token.role as string;
        session.user.clientId = token.clientId as string | null;
        session.user.staffRole = (token.staffRole as "OWNER" | "MEMBER" | null) ?? null;
        session.user.clientRole = (token.clientRole as "OWNER" | "MEMBER" | null) ?? null;
      }
      return session;
    },
  },
  providers: [], // Configured in auth.ts
} satisfies NextAuthConfig;
