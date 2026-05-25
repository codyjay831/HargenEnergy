import { redirect } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ClientTeamManager } from "@/components/portal/ClientTeamManager";
import { listClientTeamUsers } from "@/app/actions/client-users";
import { auth } from "@/auth";
import { resolveClientRole } from "@/lib/permissions";

export const dynamic = "force-dynamic";

export default async function PortalTeamPage() {
  const session = await auth();
  if (!session?.user || session.user.role !== "CLIENT" || !session.user.clientId) {
    redirect("/login");
  }

  const { users } = await listClientTeamUsers();
  const canManage = resolveClientRole(session.user.clientRole ?? null) === "OWNER";

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Team Access</h1>
        <p className="text-muted-foreground">
          Invite teammates and control owner/member access for your company portal.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Company Team</CardTitle>
        </CardHeader>
        <CardContent>
          <ClientTeamManager
            currentUserId={session.user.id}
            rows={users}
            canManage={canManage}
          />
        </CardContent>
      </Card>
    </div>
  );
}
