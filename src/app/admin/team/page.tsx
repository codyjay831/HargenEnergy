import { redirect } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { StaffTeamManager } from "@/components/admin/StaffTeamManager";
import { listStaffUsers } from "@/app/actions/staff-users";
import { auth } from "@/auth";
import { resolveStaffRole } from "@/lib/permissions";

export const dynamic = "force-dynamic";

export default async function AdminTeamPage() {
  const session = await auth();
  if (!session?.user || session.user.role !== "ADMIN") {
    redirect("/login");
  }

  const { users } = await listStaffUsers();
  const canManage = resolveStaffRole(session.user.staffRole ?? null) === "OWNER";

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Team Management</h1>
        <p className="text-muted-foreground">
          Invite and manage Hargen staff access with owner/member roles.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Hargen Staff</CardTitle>
        </CardHeader>
        <CardContent>
          <StaffTeamManager
            currentUserId={session.user.id}
            rows={users}
            canManage={canManage}
          />
        </CardContent>
      </Card>
    </div>
  );
}
