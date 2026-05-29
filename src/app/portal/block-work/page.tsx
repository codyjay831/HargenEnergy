import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PortalBlockWorkboardClient } from "@/components/block-work/PortalBlockWorkboardClient";
import { loadPortalBlockWorkboard } from "@/lib/block-work";
import { isBlockWorkboardEnabled } from "@/lib/block-work-policy";

export const dynamic = "force-dynamic";

export default async function PortalBlockWorkPage() {
  const session = await auth();
  const clientId = session?.user?.clientId;
  if (!clientId) {
    redirect("/portal");
  }

  if (!isBlockWorkboardEnabled()) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Block workboard unavailable</CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground">
          Block workboard is disabled right now. Contact Hargen if you need help.
        </CardContent>
      </Card>
    );
  }

  const items = await loadPortalBlockWorkboard(clientId);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">My Block Work</h1>
        <p className="text-muted-foreground">
          Track subscribed block tasks, request attention, and review proof-of-work updates.
        </p>
      </div>
      <PortalBlockWorkboardClient items={items} />
    </div>
  );
}
