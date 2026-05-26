import type { Metadata } from "next";
import { WalkthroughPublicScheduler } from "@/components/scheduling/WalkthroughPublicScheduler";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Schedule walkthrough",
  robots: { index: false, follow: false },
};

interface WalkthroughSchedulePageProps {
  params: Promise<{ token: string }>;
}

export default async function WalkthroughSchedulePage({ params }: WalkthroughSchedulePageProps) {
  const resolvedParams = await params;
  const token = typeof resolvedParams?.token === "string" ? resolvedParams.token : "";

  return (
    <div className="min-h-screen bg-slate-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="mx-auto w-full max-w-2xl space-y-6">
        <div className="text-center">
          <p className="text-sm font-semibold uppercase tracking-wider text-primary">
            Hargen Energy
          </p>
          <h1 className="mt-2 text-2xl font-bold tracking-tight">Walkthrough scheduling</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Choose a time for your walkthrough with our team.
          </p>
        </div>

        {token ? (
          <WalkthroughPublicScheduler token={token} />
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
