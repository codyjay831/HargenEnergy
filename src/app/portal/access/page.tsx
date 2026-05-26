import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PortalSystemAccessChecklist } from "@/components/forms/PortalSystemAccessChecklist";

export const dynamic = "force-dynamic";

export default async function PortalAccessPage() {
  const session = await auth();
  const clientId = session?.user?.clientId;

  if (!clientId) {
    return <div>Client not found.</div>;
  }

  const records = await prisma.clientSystemAccess.findMany({
    where: { clientId },
    orderBy: { createdAt: "asc" },
  });

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">System access</h1>
        <p className="text-muted-foreground">
          Share AHJ, utility, CRM, and workspace access through vault links or user invites.
          Recommended, not required.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Access checklist</CardTitle>
        </CardHeader>
        <CardContent>
          <PortalSystemAccessChecklist
            items={records.map((record) => ({
              id: record.id,
              systemType: record.systemType,
              label: record.label,
              loginUrl: record.loginUrl,
              username: record.username,
              accessMethod: record.accessMethod,
              vaultLink: null,
              status: record.status,
              notes: record.notes,
              createdViaPortal: record.createdViaPortal,
            }))}
          />
        </CardContent>
      </Card>
    </div>
  );
}
