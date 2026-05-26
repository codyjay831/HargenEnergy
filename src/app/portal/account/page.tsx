import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Building2 } from "lucide-react";
import { PortalSupportSetupCard } from "@/components/portal/PortalSupportSetupCard";
import { getClientPortalSupportSetup } from "@/lib/portal-support";
import { getClientWalkthroughRequest } from "@/lib/portal-walkthrough";
import { prisma } from "@/lib/prisma";
import { getClientSetupReadiness } from "@/lib/client-setup-readiness";
import { PortalSetupGuide } from "@/components/portal/PortalSetupGuide";
import { ChangePasswordForm } from "@/components/forms/ChangePasswordForm";

export const dynamic = "force-dynamic";

export default async function PortalAccount() {
  const session = await auth();
  const clientId = session?.user?.clientId;

  if (!clientId) {
    return <div>Client not found.</div>;
  }

  const [client, setup, setupReadiness, walkthrough] = await Promise.all([
    prisma.client.findUnique({
      where: { id: clientId },
      select: {
        companyName: true,
        contactName: true,
        email: true,
        phone: true,
        website: true,
        serviceArea: true,
      },
    }),
    getClientPortalSupportSetup(clientId),
    getClientSetupReadiness(clientId),
    getClientWalkthroughRequest(clientId),
  ]);

  if (!client || "error" in setup || "error" in setupReadiness) {
    redirect("/portal");
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Account Settings</h1>
        <p className="text-muted-foreground">
          View your company profile and support plan details.
        </p>
      </div>

      <PortalSetupGuide
        readiness={setupReadiness}
        setup={setup}
        walkthrough={walkthrough}
      />

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Building2 className="h-5 w-5 text-primary" />
              Company Profile
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex flex-col">
              <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                Company Name
              </span>
              <span className="text-sm font-medium">{client.companyName}</span>
            </div>
            <div className="flex flex-col">
              <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                Main Contact
              </span>
              <span className="text-sm font-medium">{client.contactName}</span>
            </div>
            <div className="flex flex-col">
              <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                Email Address
              </span>
              <span className="text-sm font-medium">{client.email}</span>
            </div>
            {client.phone && (
              <div className="flex flex-col">
                <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  Phone Number
                </span>
                <span className="text-sm font-medium">{client.phone}</span>
              </div>
            )}
            {client.website && (
              <div className="flex flex-col">
                <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  Website
                </span>
                <span className="text-sm font-medium">{client.website}</span>
              </div>
            )}
            {client.serviceArea && (
              <div className="flex flex-col">
                <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  Service Area
                </span>
                <span className="text-sm font-medium">{client.serviceArea}</span>
              </div>
            )}
          </CardContent>
        </Card>

        <PortalSupportSetupCard setup={setup} walkthrough={walkthrough} />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Password & Security</CardTitle>
        </CardHeader>
        <CardContent>
          <ChangePasswordForm />
        </CardContent>
      </Card>
    </div>
  );
}
