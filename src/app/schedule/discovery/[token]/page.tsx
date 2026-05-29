import type { Metadata } from "next";
import { DiscoveryPublicScheduler } from "@/components/scheduling/DiscoveryPublicScheduler";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Schedule discovery",
  robots: { index: false, follow: false },
};

interface DiscoverySchedulePageProps {
  params: Promise<{ token: string }>;
  searchParams: Promise<{ from?: string }>;
}

export default async function DiscoverySchedulePage({
  params,
  searchParams,
}: DiscoverySchedulePageProps) {
  const resolvedParams = await params;
  const resolvedSearch = await searchParams;
  const token = typeof resolvedParams?.token === "string" ? resolvedParams.token : "";
  const fromRequest = resolvedSearch?.from === "request";

  return (
    <div className="min-h-screen bg-slate-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="mx-auto w-full max-w-3xl space-y-6">
        <div className="text-center">
          <p className="text-sm font-semibold uppercase tracking-wider text-primary">
            Hargen Energy
          </p>
          <h1 className="mt-2 text-2xl font-bold tracking-tight">Discovery scheduling</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Choose a time for your discovery with our team.
          </p>
        </div>

        {token ? (
          <DiscoveryPublicScheduler token={token} fromRequest={fromRequest} />
        ) : (
          <Card>
            <CardHeader>
              <CardTitle>Invalid link</CardTitle>
              <CardDescription>This scheduling link is missing or malformed.</CardDescription>
            </CardHeader>
            <CardContent />
          </Card>
        )}
      </div>
    </div>
  );
}
