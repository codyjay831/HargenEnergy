import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import Link from "next/link";
import { format } from "date-fns";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft, Building2, User, Mail, Phone, Globe, MapPin, CreditCard, Clock } from "lucide-react";
import { cn, safeExternalHref } from "@/lib/utils";
import { ClientBillingManager } from "@/components/forms/ClientBillingManager";
import { ClientBrandingManager } from "@/components/forms/ClientBrandingManager";
import { ClientPortalAccessManager } from "@/components/forms/ClientPortalAccessManager";
import { ClientSystemAccessManager } from "@/components/forms/ClientSystemAccessManager";
import { LogTimeForm } from "@/components/forms/LogTimeForm";
import { ClientStatus, Role } from "@/generated/prisma/client";
import { ActivateClientButton } from "@/components/forms/ActivateClientButton";
import { LogClientOpsForm } from "@/components/forms/LogClientOpsForm";
import { calculateWeeklyUsage } from "@/lib/usage";

export const dynamic = "force-dynamic";

interface ClientDetailPageProps {
  params: Promise<{ id: string }>;
}

export default async function ClientDetailPage({ params }: ClientDetailPageProps) {
  const resolvedParams = await params;
  const id = typeof resolvedParams?.id === "string" ? resolvedParams.id : undefined;

  if (!id) {
    notFound();
  }

  const client = await prisma.client.findUnique({
    where: { id },
    include: {
      users: {
        where: { role: Role.CLIENT },
        select: { id: true, email: true, name: true },
      },
      systemAccesses: {
        orderBy: { createdAt: "asc" },
      },
      requests: {
        orderBy: { createdAt: "desc" },
        take: 5
      },
      timeEntries: {
        orderBy: { date: "desc" },
        take: 10
      }
    }
  });

  if (!client) {
    notFound();
  }

  const usage = calculateWeeklyUsage(client.timeEntries, client.weeklyHours);

  return (
    <div className="space-y-8">
      <div className="flex items-center gap-4">
        <Link 
          href="/admin/clients" 
          className={cn(buttonVariants({ variant: "ghost", size: "icon" }))}
        >
          <ArrowLeft className="h-4 w-4" />
        </Link>
        <div>
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="text-2xl font-bold tracking-tight">{client.companyName}</h1>
            <Badge variant={client.status === ClientStatus.ACTIVE ? "default" : "secondary"}>
              {client.status === ClientStatus.ACTIVE ? "Active client" : "Prospect"}
            </Badge>
          </div>
          <p className="text-muted-foreground">
            {client.status === ClientStatus.ACTIVE && client.activatedAt
              ? `Active since ${format(new Date(client.activatedAt), "MMMM d, yyyy")}`
              : `Prospect since ${format(new Date(client.createdAt), "MMMM d, yyyy")}`}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left Column: Client Info & Recent Requests */}
        <div className="lg:col-span-2 space-y-8">
          <Card>
            <CardHeader>
              <CardTitle>Company Details</CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-4">
                <div className="flex items-start gap-3">
                  <Building2 className="h-4 w-4 text-muted-foreground mt-1" />
                  <div>
                    <p className="text-sm font-medium">{client.companyName}</p>
                    <p className="text-xs text-muted-foreground">Company Name</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <User className="h-4 w-4 text-muted-foreground mt-1" />
                  <div>
                    <p className="text-sm font-medium">{client.contactName}</p>
                    <p className="text-xs text-muted-foreground">{client.role || "Primary Contact"}</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <Mail className="h-4 w-4 text-muted-foreground mt-1" />
                  <div>
                    <p className="text-sm font-medium">{client.email}</p>
                    <p className="text-xs text-muted-foreground">Email</p>
                  </div>
                </div>
              </div>
              <div className="space-y-4">
                {client.phone && (
                  <div className="flex items-start gap-3">
                    <Phone className="h-4 w-4 text-muted-foreground mt-1" />
                    <div>
                      <p className="text-sm font-medium">{client.phone}</p>
                      <p className="text-xs text-muted-foreground">Phone</p>
                    </div>
                  </div>
                )}
                {client.website && (() => {
                  const href = safeExternalHref(client.website);
                  return (
                    <div className="flex items-start gap-3">
                      <Globe className="h-4 w-4 text-muted-foreground mt-1" />
                      <div>
                        {href ? (
                          <a href={href} target="_blank" rel="noopener noreferrer nofollow" className="text-sm font-medium text-primary hover:underline">
                            {client.website.replace(/^https?:\/\//, "")}
                          </a>
                        ) : (
                          <span className="text-sm font-medium text-slate-700">{client.website}</span>
                        )}
                        <p className="text-xs text-muted-foreground">Website</p>
                      </div>
                    </div>
                  );
                })()}
                {client.serviceArea && (
                  <div className="flex items-start gap-3">
                    <MapPin className="h-4 w-4 text-muted-foreground mt-1" />
                    <div>
                      <p className="text-sm font-medium">{client.serviceArea}</p>
                      <p className="text-xs text-muted-foreground">Service Area</p>
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {client.status === ClientStatus.LEAD && (
            <Card className="border-amber-200 bg-amber-50/40">
              <CardHeader>
                <CardTitle>Activation</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <p className="text-sm text-muted-foreground">
                  Mark the company active after walkthrough, contract, and payment. Then set up billing and send a portal invite.
                </p>
                <ActivateClientButton clientId={client.id} />
              </CardContent>
            </Card>
          )}

          {client.status === ClientStatus.ACTIVE && (
            <Card>
              <CardHeader>
                <CardTitle>Log client ops request</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground mb-4">
                  Capture work that came in by email, phone, text, or voicemail.
                </p>
                <LogClientOpsForm clientId={client.id} />
              </CardContent>
            </Card>
          )}

          <Card>
            <CardHeader>
              <CardTitle>Recent Requests</CardTitle>
            </CardHeader>
            <CardContent>
              {client.requests.length === 0 ? (
                <p className="text-sm text-muted-foreground py-4 text-center">No requests from this client yet.</p>
              ) : (
                <div className="space-y-4">
                  {client.requests.map((request) => (
                    <div key={request.id} className="flex items-center justify-between p-3 border rounded-lg">
                      <div>
                        <p className="font-medium text-sm">{request.title}</p>
                        <p className="text-xs text-muted-foreground">{format(new Date(request.createdAt), "MMM d, yyyy")}</p>
                      </div>
                      <div className="flex items-center gap-3">
                        <Badge variant="outline">{request.status.replace("_", " ")}</Badge>
                        <Link 
                          href={`/admin/requests/${request.id}`}
                          className="text-primary hover:underline text-sm font-medium"
                        >
                          View
                        </Link>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Recent Time Entries</CardTitle>
            </CardHeader>
            <CardContent>
              {client.timeEntries.length === 0 ? (
                <p className="text-sm text-muted-foreground py-4 text-center">No time entries logged for this client yet.</p>
              ) : (
                <div className="space-y-4">
                  {client.timeEntries.map((entry) => (
                    <div key={entry.id} className="flex items-center justify-between p-3 border rounded-lg">
                      <div className="flex-1">
                        <p className="text-sm font-medium">{entry.description}</p>
                        <p className="text-xs text-muted-foreground">
                          {format(new Date(entry.date), "MMM d, yyyy")} • {entry.billableType.replace("_", " ")}
                        </p>
                      </div>
                      <div className="text-sm font-bold ml-4">
                        {entry.minutes}m
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Right Column: Billing & Subscription */}
        <div className="space-y-8">
          <Card className="border-primary/20">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Clock className="h-5 w-5 text-primary" />
                Weekly Capacity
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <p className="text-xs text-muted-foreground uppercase">Reserved</p>
                  <p className="text-xl font-bold">{client.weeklyHours} hrs</p>
                </div>
                <div className="space-y-1">
                  <p className="text-xs text-muted-foreground uppercase">Used</p>
                  <p className={cn("text-xl font-bold", usage.isOverLimit ? "text-red-600" : usage.isNearLimit ? "text-orange-600" : "text-green-600")}>
                    {(usage.includedMinutesThisWeek / 60).toFixed(1)} hrs
                  </p>
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex justify-between text-xs">
                  <span>Usage</span>
                  <span>{usage.percentUsed.toFixed(0)}%</span>
                </div>
                <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden">
                  <div 
                    className={cn("h-full transition-all", usage.isOverLimit ? "bg-red-500" : usage.isNearLimit ? "bg-orange-500" : "bg-primary")} 
                    style={{ width: `${Math.min(usage.percentUsed, 100)}%` }}
                  />
                </div>
              </div>

              <div className="pt-4 border-t space-y-3">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Remaining:</span>
                  <span className="font-medium">{(usage.remainingIncludedMinutes / 60).toFixed(1)} hrs</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Overflow:</span>
                  <span className="font-medium text-orange-600">{(usage.overflowMinutesThisWeek / 60).toFixed(1)} hrs</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Non-billable:</span>
                  <span className="font-medium">{(usage.nonBillableMinutesThisWeek / 60).toFixed(1)} hrs</span>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Clock className="h-5 w-5 text-primary" />
                Log Time
              </CardTitle>
            </CardHeader>
            <CardContent>
              <LogTimeForm clientId={client.id} />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Portal access</CardTitle>
            </CardHeader>
            <CardContent>
              <ClientPortalAccessManager
                clientId={client.id}
                clientStatus={client.status}
                defaultEmail={client.email}
                defaultName={client.contactName}
                users={client.users}
              />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Portal branding</CardTitle>
            </CardHeader>
            <CardContent>
              <ClientBrandingManager
                clientId={client.id}
                website={client.website}
                logoUrl={client.logoUrl}
                brandAccent={client.brandAccent}
              />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">System access checklist</CardTitle>
            </CardHeader>
            <CardContent>
              <ClientSystemAccessManager
                clientId={client.id}
                records={client.systemAccesses}
              />
            </CardContent>
          </Card>

          <Card className="border-slate-200">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <CreditCard className="h-4 w-4 text-primary" />
                Billing & Subscription
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ClientBillingManager 
                clientId={client.id}
                currentPlan={client.planType}
                subscriptionStatus={client.subscriptionStatus}
                stripeCustomerId={client.stripeCustomerId}
              />
              
              {client.subscriptionCurrentPeriodEnd && (
                <div className="mt-6 pt-6 border-t text-sm">
                  <p className="text-muted-foreground flex justify-between">
                    <span>Period End:</span>
                    <span className="text-slate-900 font-medium">
                      {format(new Date(client.subscriptionCurrentPeriodEnd), "MMM d, yyyy")}
                    </span>
                  </p>
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">Internal Notes</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-slate-600 italic">
                {client.notes || "No internal notes for this client."}
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
