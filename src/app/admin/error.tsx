"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AlertCircle } from "lucide-react";
import { reportAdminRouteError } from "@/app/actions/admin-error-report";

function clientIdFromAdminPath(pathname: string | null): string | undefined {
  if (!pathname) return undefined;
  const match = pathname.match(/^\/admin\/clients\/([^/?#]+)/);
  return match?.[1];
}

export default function AdminError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const pathname = usePathname();
  const clientId = clientIdFromAdminPath(pathname);

  useEffect(() => {
    const payload = {
      message: error.message,
      digest: error.digest,
      stack: error.stack,
      route: pathname ?? undefined,
      clientId,
    };

    console.error("[admin-route-error:client-boundary]", payload);

    void reportAdminRouteError(payload);
  }, [clientId, error, pathname]);

  const showDevDetails = process.env.NODE_ENV !== "production";

  return (
    <div className="flex items-center justify-center min-h-[60vh]">
      <Card className="max-w-md w-full border-red-200">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-red-600">
            <AlertCircle className="h-5 w-5" />
            Something went wrong
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">
            We encountered an error loading this page. This has been logged and we&apos;ll look into it.
          </p>
          {showDevDetails && error.message && (
            <p className="text-xs text-red-700 font-mono bg-red-50 p-2 rounded break-words">
              {error.message}
            </p>
          )}
          {error.digest && (
            <p className="text-xs text-muted-foreground font-mono bg-slate-50 p-2 rounded">
              Error ID: {error.digest}
            </p>
          )}
          <Button onClick={reset} className="w-full">
            Try again
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
