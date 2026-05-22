import NextAuth from "next-auth";
import { authConfig } from "./auth.config";

export default NextAuth(authConfig).auth;

export const config = {
  // Auth only where session checks matter — marketing pages skip middleware entirely.
  matcher: ["/admin/:path*", "/portal/:path*", "/login", "/setup/:path*"],
};
