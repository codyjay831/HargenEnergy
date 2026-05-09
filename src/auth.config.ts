import type { NextAuthConfig } from "next-auth";

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
    jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.role = user.role;
        token.clientId = (user as { clientId?: string | null }).clientId;
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
