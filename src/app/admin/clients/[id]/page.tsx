import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import Link from "next/link";
import { format } from "date-fns";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft, User, Mail, Phone, Globe, MapPin, CreditCard, Clock } from "lucide-react";
import { cn, safeExternalHref } from "@/lib/utils";
import { ClientBillingManager } from "@/components/forms/ClientBillingManager";
import { ClientBrandingManager } from "@/components/forms/ClientBrandingManager";
import { ClientPortalAccessManager } from "@/components/forms/ClientPortalAccessManager";
import { ClientSystemAccessManager } from "@/components/forms/ClientSystemAccessManager";
import { LogTimeForm } from "@/components/forms/LogTimeForm";
import {
  ClientStatus,
  Role,
  SupportRequestKind,
  Client,
  SupportRequest,
  TimeEntry,
  ClientSystemAccess,
  EngagementType,
} from "@/generated/prisma/client";
import { ClientEngagementManager } from "@/components/admin/ClientEngagementManager";
import { getEngagementLabel } from "@/lib/engagement";
import { ActivateClientButton } from "@/components/forms/ActivateClientButton";
import { LogClientOpsForm } from "@/components/forms/LogClientOpsForm";
import { calculateWeeklyUsage, type WeeklyUsage } from "@/lib/usage";
import { OnboardingWrapper } from "@/components/onboarding/OnboardingWrapper";
import { PRODUCT_LANGUAGE } from "@/lib/product-language";
import { formatIntakePlanLabel } from "@/lib/intake-plan";
import { AdminSetupGuide } from "@/components/admin/AdminSetupGuide";
import { getClientSetupReadiness } from "@/lib/client-setup-readiness";
import { getClientSystemAccessForAdmin } from "@/app/actions/system-access";

export const dynamic = "force-dynamic";

interface ClientDetailPageProps {
  params: Promise<{ id: string }>;
}

type ClientWithRelations = Client & {
  billingOverrideCreatedBy?: { name: string | null; email: string } | null;
  users: { id: string; email: string; name: string | null }[];
  systemAccesses: ClientSystemAccess[];
  requests: SupportRequest[];
  timeEntries: TimeEntry[];
  approvedWorkTasks?: { workTaskId: string }[];
};

export default async function ClientDetailPage({ params }: ClientDetailPageProps) {
  const resolvedParams = await params;
  const id = typeof resolvedParams?.id === "string" ? resolvedParams.id : undefined;

  if (!id) {
    notFound();
  }

  const client = await prisma.client.findUnique({
    where: { id },
    include: {
      billingOverrideCreatedBy: {
        select: { name: true, email: true },
      },
      users: {
        where: { role: Role.CLIENT },
        select: { id: true, email: true, name: true },
      },
      approvedWorkTasks: { select: { workTaskId: true } },
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
  }) as (ClientWithRelations & {
    engagementType: EngagementType;
    approvedWorkTasks: { workTaskId: string }[];
  }) | null;

  const catalogCategories = await prisma.serviceCategory.findMany({
    where: { isActive: true },
    include: {
      tasks: {
        where: { isActive: true },
        orderBy: { basePriority: "asc" },
        select: { id: true, name: true },
      },
    },
    orderBy: { name: "asc" },
  });

  if (!client) {
    notFound();
  }

  const isProspect = client.status === ClientStatus.LEAD;
  const usage = calculateWeeklyUsage(client.timeEntries, client.weeklyHours);

  const latestWalkthrough = await prisma.supportRequest.findFirst({
    where: {
      clientId: client.id,
      kind: SupportRequestKind.PROSPECT_INTAKE,
    },
    orderBy: { createdAt: "desc" },
    include: {
      timeEntries: { orderBy: { date: "desc" }, take: 10 },
      requestedWorkTasks: {
        include: {
          workTask: {
            select: { id: true, name: true, description: true },
          },
        },
      },
    },
  });

  const suggestedWorkTaskIds =
    latestWalkthrough?.requestedWorkTasks.map((row) => row.workTaskId) ?? [];

  const walkthroughRequestForDrawer = latestWalkthrough
    ? {
        ...latestWalkthrough,
        requestedTasks: latestWalkthrough.requestedWorkTasks.map((row) => ({
          name: row.workTask.name,
          description: row.workTask.description,
        })),
      }
    : null;

  const walkthroughMetadata = latestWalkthrough?.metadata as { intakePlan?: string } | null;
  const walkthroughPlanRequestBased =
    walkthroughMetadata?.intakePlan === "request-based" ||
    walkthroughMetadata?.intakePlan === "one-time";
  const approvedWorkTaskCount = client.approvedWorkTasks.length;
  const planInterestLabel = formatIntakePlanLabel(walkthroughMetadata?.intakePlan);
  const setupReadinessResult = await getClientSetupReadiness(client.id);
  const decryptedSystemAccesses = await getClientSystemAccessForAdmin(client.id);

  if ("error" in setupReadinessResult) {
    notFound();
  }

  const setupReadiness = setupReadinessResult;

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
            {client.status === ClientStatus.ACTIVE && (
              <Badge variant="outline">{getEngagementLabel(client.engagementType)}</Badge>
            )}
          </div>
          <p className="text-muted-foreground">
            {client.status === ClientStatus.ACTIVE && client.activatedAt
              ? `Active since ${format(new Date(client.activatedAt), "MMMM d, yyyy")}`
              : `Prospect since ${format(new Date(client.createdAt), "MMMM d, yyyy")}`}
          </p>
        </div>
      </div>

      <div id="setup-guide" className="scroll-mt-8">
        <AdminSetupGuide
          readiness={setupReadiness}
          client={{
            id: client.id,
            companyName: client.companyName,
            contactName: client.contactName,
            email: client.email,
            phone: client.phone,
            role: client.role,
            website: client.website,
            serviceArea: client.serviceArea,
            currentTools: client.currentTools,
            status: client.status,
            planType: client.planType,
            engagementType: client.engagementType,
            billingMode: client.billingMode,
            billingOverrideReason: client.billingOverrideReason,
            billingOverrideExpiresAt: client.billingOverrideExpiresAt,
            billingOverrideCreatedAt: client.billingOverrideCreatedAt,
            billingOverrideCreatedById: client.billingOverrideCreatedById,
            billingOverrideCreatedByName: client.billingOverrideCreatedBy?.name ?? null,
            billingOverrideCreatedByEmail: client.billingOverrideCreatedBy?.email ?? null,
            subscriptionStatus: client.subscriptionStatus,
            stripeCustomerId: client.stripeCustomerId,
            stripeSubscriptionId: client.stripeSubscriptionId,
            subscriptionCurrentPeriodEnd: client.subscriptionCurrentPeriodEnd,
            approvedWorkTaskCount,
            users: client.users,
          }}
          engagement={{
            approvedWorkTaskIds: client.approvedWorkTasks.map((a) => a.workTaskId),
            suggestedWorkTaskIds,
            categories: catalogCategories,
            walkthroughPlanRequestBased,
          }}
          systemAccessRecords={decryptedSystemAccesses}
          adminRequestsHref={`/admin/requests?clientId=${client.id}`}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Status-Aware Layout */}
        {isProspect ? (
          <>
            {/* Prospect View: Onboarding First */}
            <div className="lg:col-span-2 space-y-8">
              <OnboardingWrapper
                client={{
                  id: client.id,
                  companyName: client.companyName,
                  contactName: client.contactName,
                  email: client.email,
                  status: client.status,
                  planType: client.planType,
                  engagementType: client.engagementType,
                  billingMode: client.billingMode,
                  billingOverrideReason: client.billingOverrideReason,
                  billingOverrideExpiresAt: client.billingOverrideExpiresAt,
                  billingOverrideCreatedAt: client.billingOverrideCreatedAt,
                  billingOverrideCreatedById: client.billingOverrideCreatedById,
                  approvedWorkTaskCount,
                  subscriptionStatus: client.subscriptionStatus,
                  stripeCustomerId: client.stripeCustomerId,
                  stripeSubscriptionId: client.stripeSubscriptionId,
                  users: client.users,
                }}
                intakeClient={{
                  companyName: client.companyName,
                  contactName: client.contactName,
                  email: client.email,
                  phone: client.phone,
                  role: client.role,
                  website: client.website,
                  serviceArea: client.serviceArea,
                  currentTools: client.currentTools,
                }}
                walkthroughMetadata={walkthroughMetadata}
                latestWalkthroughRequest={walkthroughRequestForDrawer}
              />

              <Card id="client-details" className="scroll-mt-8">
                <CardHeader>
                  <CardTitle>Company Details</CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">{renderCompanyDetails(client)}</CardContent>
              </Card>

              {client.notes && (
                <Card>
                  <CardHeader>
                    <CardTitle>Internal Notes</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-slate-700 whitespace-pre-wrap">{client.notes}</p>
                  </CardContent>
                </Card>
              )}
            </div>

            <div className="space-y-8">
              {/* Prospect sidebar: minimal */}
              <Card>
                <CardHeader>
                  <CardTitle>Quick Info</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1">Status</p>
                    <Badge variant="secondary">{PRODUCT_LANGUAGE.prospect.badge}</Badge>
                  </div>
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1">Plan Interest</p>
                    <p className="text-sm">{planInterestLabel}</p>
                  </div>
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1">Created</p>
                    <p className="text-sm">{format(new Date(client.createdAt), "MMM d, yyyy")}</p>
                  </div>
                </CardContent>
              </Card>

              <div id="engagement" className="scroll-mt-8">
                <ClientEngagementManager
                  clientId={client.id}
                  engagementType={client.engagementType}
                  approvedWorkTaskIds={client.approvedWorkTasks.map((a) => a.workTaskId)}
                  suggestedWorkTaskIds={suggestedWorkTaskIds}
                  categories={catalogCategories}
                  walkthroughPlanRequestBased={walkthroughPlanRequestBased}
                />
              </div>

              <div id="system-access" className="scroll-mt-8">
                {renderSystemAccess(client.id, decryptedSystemAccesses)}
              </div>

              <Card id="activation" className="scroll-mt-8 border-amber-200 bg-amber-50/40">
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
            </div>
          </>
        ) : (
          <>
            {/* Active Client View: Delivery Tools */}
            <div className="lg:col-span-2 space-y-8">
              <div id="client-details" className="scroll-mt-8">
                {renderCompanyDetailsCard(client)}
              </div>
              <div id="work-requests" className="scroll-mt-8">
                {renderRecentRequests(client)}
              </div>
              <Card>
                <CardHeader>
                  <CardTitle>Internal Notes</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-slate-600 italic">
                    {client.notes || "No internal notes for this client."}
                  </p>
                </CardContent>
              </Card>
            </div>

            <div className="space-y-8">
              <div id="engagement" className="scroll-mt-8">
                <ClientEngagementManager
                  clientId={client.id}
                  engagementType={client.engagementType}
                  approvedWorkTaskIds={client.approvedWorkTasks.map((a) => a.workTaskId)}
                  suggestedWorkTaskIds={suggestedWorkTaskIds}
                  categories={catalogCategories}
                  walkthroughPlanRequestBased={walkthroughPlanRequestBased}
                />
              </div>
              {client.engagementType === EngagementType.SUPPORT_BLOCK && renderUsageCard(client, usage)}
              {renderTimeLogging(client)}
              {renderClientOpsLogging(client)}
              <div id="system-access" className="scroll-mt-8">
                {renderSystemAccess(client.id, decryptedSystemAccesses)}
              </div>
              {renderBranding(client)}
              <div id="billing" className="scroll-mt-8">
                {renderBilling(client)}
              </div>
              <div id="portal-access" className="scroll-mt-8">
                {renderPortalAccess(client)}
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

// Helper render functions for active client view
function renderCompanyDetails(client: Client) {
  return (
    <>
      <div className="flex items-start gap-3">
        <User className="h-4 w-4 text-muted-foreground mt-1" />
        <div>
          <p className="text-sm font-medium">{client.contactName}</p>
          <p className="text-xs text-muted-foreground">{client.role || "Contact Person"}</p>
        </div>
      </div>
      <div className="flex items-start gap-3">
        <Mail className="h-4 w-4 text-muted-foreground mt-1" />
        <div>
          <p className="text-sm font-medium">{client.email}</p>
          <p className="text-xs text-muted-foreground">Email</p>
        </div>
      </div>
      {client.phone && (
        <div className="flex items-start gap-3">
          <Phone className="h-4 w-4 text-muted-foreground mt-1" />
          <div>
            <p className="text-sm font-medium">{client.phone}</p>
            <p className="text-xs text-muted-foreground">Phone</p>
          </div>
        </div>
      )}
      {client.website && (
        <div className="flex items-start gap-3">
          <Globe className="h-4 w-4 text-muted-foreground mt-1" />
          <div>
            <a
              href={safeExternalHref(client.website) ?? undefined}
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm font-medium text-primary hover:underline"
            >
              {client.website}
            </a>
            <p className="text-xs text-muted-foreground">Website</p>
          </div>
        </div>
      )}
      {client.serviceArea && (
        <div className="flex items-start gap-3">
          <MapPin className="h-4 w-4 text-muted-foreground mt-1" />
          <div>
            <p className="text-sm font-medium">{client.serviceArea}</p>
            <p className="text-xs text-muted-foreground">Service Area</p>
          </div>
        </div>
      )}
      {client.currentTools && (
        <div className="flex items-start gap-3">
          <Clock className="h-4 w-4 text-muted-foreground mt-1" />
          <div>
            <p className="text-sm font-medium whitespace-pre-wrap">{client.currentTools}</p>
            <p className="text-xs text-muted-foreground">Current Tools</p>
          </div>
        </div>
      )}
    </>
  );
}

function renderCompanyDetailsCard(client: Client) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Company Details</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">{renderCompanyDetails(client)}</CardContent>
    </Card>
  );
}

function renderRecentRequests(client: ClientWithRelations) {
  const clientRequests = client.requests.filter((r: SupportRequest) => r.kind === "CLIENT_OPS");
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>Recent {PRODUCT_LANGUAGE.workRequest.plural}</CardTitle>
        <Link href="/admin/requests" className="text-xs text-primary hover:underline font-medium">
          View All
        </Link>
      </CardHeader>
      <CardContent>
        {clientRequests.length === 0 ? (
          <p className="text-sm text-muted-foreground py-4 text-center">No work requests yet.</p>
        ) : (
          <div className="space-y-4">
            {clientRequests.map((request: SupportRequest) => (
              <Link
                key={request.id}
                href={`/admin/requests/${request.id}`}
                className="flex items-center justify-between p-3 border rounded-lg hover:bg-slate-50 transition-colors"
              >
                <div>
                  <p className="font-medium text-sm">{request.title}</p>
                  <p className="text-xs text-muted-foreground">
                    {format(new Date(request.createdAt), "MMM d, yyyy")} • {request.status.replace("_", " ")}
                  </p>
                </div>
                <span className="text-primary text-sm">Open →</span>
              </Link>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function renderUsageCard(client: Client, usage: WeeklyUsage) {
  return (
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
  );
}

function renderTimeLogging(client: Client & { engagementType: EngagementType }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Log Time</CardTitle>
      </CardHeader>
      <CardContent>
        <LogTimeForm
          clientId={client.id}
          engagementType={client.engagementType}
          supportRequestId={undefined}
          isOverflowApproved={false}
        />
      </CardContent>
    </Card>
  );
}

function renderClientOpsLogging(client: Client) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Log {PRODUCT_LANGUAGE.workRequest.singular}</CardTitle>
      </CardHeader>
      <CardContent>
        <LogClientOpsForm clientId={client.id} />
      </CardContent>
    </Card>
  );
}

function renderSystemAccess(
  clientId: string,
  records: ClientSystemAccess[],
) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">System Access</CardTitle>
      </CardHeader>
      <CardContent>
        <ClientSystemAccessManager clientId={clientId} records={records} />
      </CardContent>
    </Card>
  );
}

function renderBranding(client: Client) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Branding</CardTitle>
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
  );
}

function renderBilling(
  client: Client & {
    engagementType: EngagementType;
    billingOverrideCreatedBy?: { name: string | null; email: string } | null;
  },
) {
  const isRequestBased = client.engagementType === EngagementType.REQUEST_BASED;

  return (
    <Card className="border-slate-200">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <CreditCard className="h-4 w-4 text-primary" />
          {isRequestBased ? "Billing" : "Billing & Subscription"}
        </CardTitle>
      </CardHeader>
      <CardContent>
        {isRequestBased ? (
          <p className="text-sm text-muted-foreground leading-relaxed">
            Request-Based Work clients are priced per request after review.
          </p>
        ) : (
          <>
            <ClientBillingManager
              clientId={client.id}
              engagementType={client.engagementType}
              billingMode={client.billingMode}
              billingOverrideReason={client.billingOverrideReason}
              billingOverrideExpiresAt={client.billingOverrideExpiresAt}
              billingOverrideCreatedAt={client.billingOverrideCreatedAt}
              billingOverrideCreatedById={client.billingOverrideCreatedById}
              billingOverrideCreatedByName={client.billingOverrideCreatedBy?.name}
              billingOverrideCreatedByEmail={client.billingOverrideCreatedBy?.email}
              currentPlan={client.planType}
              subscriptionStatus={client.subscriptionStatus}
              stripeCustomerId={client.stripeCustomerId}
              stripeSubscriptionId={client.stripeSubscriptionId}
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
          </>
        )}
      </CardContent>
    </Card>
  );
}

function renderPortalAccess(
  client: ClientWithRelations & {
    engagementType: EngagementType;
    approvedWorkTasks: { workTaskId: string }[];
  },
) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <Mail className="h-4 w-4 text-primary" />
          Portal Access
        </CardTitle>
      </CardHeader>
      <CardContent>
        <ClientPortalAccessManager
          clientId={client.id}
          clientStatus={client.status}
          engagementType={client.engagementType}
          approvedWorkTaskCount={client.approvedWorkTasks.length}
          defaultEmail={client.email}
          defaultName={client.contactName}
          users={client.users}
        />
      </CardContent>
    </Card>
  );
}
