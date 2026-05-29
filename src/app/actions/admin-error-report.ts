"use server";

import { requireStaff } from "@/lib/auth-guards";

export type AdminRouteErrorReport = {
  message: string;
  digest?: string;
  stack?: string;
  route?: string;
  clientId?: string;
};

export async function reportAdminRouteError(report: AdminRouteErrorReport): Promise<void> {
  const session = await requireStaff();

  console.error("[admin-route-error]", {
    message: report.message,
    digest: report.digest,
    route: report.route,
    clientId: report.clientId,
    adminUserId: session.user.id,
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
        adminUserId: session.user.id,
        digest: report.digest,
      },
    });
  } catch {
    // Sentry optional when DSN not configured
  }
}
