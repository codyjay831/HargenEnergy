"use server";

import { auth } from "@/auth";

export type AdminRouteErrorReport = {
  message: string;
  digest?: string;
  stack?: string;
  route?: string;
  clientId?: string;
};

export async function reportAdminRouteError(report: AdminRouteErrorReport): Promise<void> {
  const session = await auth();

  console.error("[admin-route-error]", {
    message: report.message,
    digest: report.digest,
    stack: report.stack,
    route: report.route,
    clientId: report.clientId,
    adminUserId: session?.user?.id ?? null,
    adminEmail: session?.user?.email ?? null,
  });

  try {
    const Sentry = await import("@sentry/nextjs");
    Sentry.captureException(new Error(report.message), {
      tags: {
        surface: "admin",
        digest: report.digest,
      },
      extra: {
        route: report.route,
        clientId: report.clientId,
        adminUserId: session?.user?.id ?? null,
        stack: report.stack,
      },
    });
  } catch {
    // Sentry optional when DSN not configured
  }
}
