import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Building2, CreditCard } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { PortalBillingPortalButton } from "@/components/forms/PortalBillingPortalButton";

export const dynamic = "force-dynamic";

export default async function PortalAccount() {
  const session = await auth();
  const clientId = session?.user?.clientId;

  if (!clientId) {
    return <div>Client not found.</div>;
  }

  const client = await prisma.client.findUnique({
    where: { id: clientId },
  });

  if (!client) {
    return <div>Client not found.</div>;
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Account Settings</h1>
        <p className="text-muted-foreground">View your company profile and support plan details.</p>
      </div>

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
              <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Company Name</span>
              <span className="text-sm font-medium">{client.companyName}</span>
            </div>
            <div className="flex flex-col">
              <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Main Contact</span>
              <span className="text-sm font-medium">{client.contactName}</span>
            </div>
            <div className="flex flex-col">
              <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Email Address</span>
              <span className="text-sm font-medium">{client.email}</span>
            </div>
            {client.phone && (
              <div className="flex flex-col">
                <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Phone Number</span>
                <span className="text-sm font-medium">{client.phone}</span>
              </div>
            )}
            {client.website && (
              <div className="flex flex-col">
                <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Website</span>
                <span className="text-sm font-medium">{client.website}</span>
              </div>
            )}
            {client.serviceArea && (
              <div className="flex flex-col">
                <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Service Area</span>
                <span className="text-sm font-medium">{client.serviceArea}</span>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CreditCard className="h-5 w-5 text-primary" />
              Support Plan
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="flex items-center justify-between">
              <div className="flex flex-col">
                <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Current Block</span>
                <span className="text-lg font-bold">{client.planType} Support</span>
              </div>
              <Badge variant={client.subscriptionStatus === "active" ? "default" : "secondary"}>
                {client.subscriptionStatus?.toUpperCase() || "PENDING"}
              </Badge>
            </div>

            <div className="flex flex-col">
              <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Weekly Reserved Hours</span>
              <span className="text-sm font-medium">{client.weeklyHours} hours per week</span>
            </div>

            {client.stripeCustomerId ? (
              <PortalBillingPortalButton />
            ) : (
              <div className="p-4 bg-slate-50 rounded-lg border border-slate-200">
                <p className="text-xs text-slate-600 leading-relaxed">
                  Retainer billing will appear here after your account manager enables Stripe billing.
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
