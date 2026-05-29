import { AdminBlockWorkboardClient } from "@/components/block-work/AdminBlockWorkboardClient";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { loadAdminBlockWorkboard } from "@/lib/block-work";
import { isBlockWorkboardEnabled } from "@/lib/block-work-policy";

export const dynamic = "force-dynamic";

export default async function AdminBlockWorkPage() {
  if (!isBlockWorkboardEnabled()) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Block workboard unavailable</CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground">
          Set `BLOCK_WORKBOARD_ENABLED=1` in production to enable this feature.
        </CardContent>
      </Card>
    );
  }

  const items = await loadAdminBlockWorkboard();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Block Workboard</h1>
        <p className="text-muted-foreground">
          Prioritize active block tasks, post proof-of-work updates, and escalate out-of-scope work
          into priced requests.
        </p>
      </div>
      <AdminBlockWorkboardClient items={items} />
    </div>
  );
}
