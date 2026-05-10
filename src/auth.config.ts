import type { NextAuthConfig } from "next-auth";

import {
  getPasswordSessionStampMs,
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
          passwordChangedAt?: Date | string | null;
          createdAt?: Date | string | null;
        };
        token.id = u.id;
        token.role = u.role;
        token.clientId = u.clientId ?? null;
        const stampMs = passwordStampMsFromUser(u);
        token.passwordChangedAt = stampMs;
        await setPasswordSessionStampMs(u.id, stampMs);
        return token;
      }

      if (token?.id) {
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
        const latest = await getPasswordSessionStampMs(token.id as string);
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
      }
      return session;
    },
  },
  providers: [], // Configured in auth.ts
} satisfies NextAuthConfig;
