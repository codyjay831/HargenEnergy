import { type ComponentType, type ReactNode } from "react";
import Link from "next/link";
import { format } from "date-fns";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { User, Mail, Phone, Globe, MapPin, CreditCard, Clock } from "lucide-react";
import { cn, safeExternalHref } from "@/lib/utils";
import { ClientBillingManager } from "@/components/forms/ClientBillingManager";
import { ClientBrandingManager } from "@/components/forms/ClientBrandingManager";
import { ClientPortalAccessManager } from "@/components/forms/ClientPortalAccessManager";
import { ClientSystemAccessManager } from "@/components/forms/ClientSystemAccessManager";
import {
  Client,
  ClientSystemAccess,
  EngagementType,
  SupportRequest,
} from "@/generated/prisma/client";
import { PRODUCT_LANGUAGE } from "@/lib/product-language";
import { adminClientTabHref } from "@/lib/admin-client-tabs";
import type { WeeklyUsage } from "@/lib/usage";

export function CompanyDetailsGrid({ client }: { client: Client }) {
  const details: Array<{
    label: string;
    value: ReactNode;
    icon: ComponentType<{ className?: string }>;
  }> = [
    {
      label: "Primary Contact",
      value: (
        <>
          <p className="text-sm font-medium">{client.contactName}</p>
          <p className="text-xs text-muted-foreground">{client.role || "Contact Person"}</p>
        </>
      ),
      icon: User,
    },
    {
      label: "Email",
      value: <p className="text-sm font-medium">{client.email}</p>,
      icon: Mail,
    },
  ];

  if (client.phone) {
    details.push({
      label: "Phone",
      value: <p className="text-sm font-medium">{client.phone}</p>,
      icon: Phone,
    });
  }

  if (client.website) {
    details.push({
      label: "Website",
      value: (
        <a
          href={safeExternalHref(client.website) ?? undefined}
          target="_blank"
          rel="noopener noreferrer"
          className="text-sm font-medium text-primary hover:underline"
        >
          {client.website}
        </a>
      ),
      icon: Globe,
    });
  }

  if (client.serviceArea) {
    details.push({
      label: "Service Area",
      value: <p className="text-sm font-medium">{client.serviceArea}</p>,
      icon: MapPin,
    });
  }

  if (client.currentTools) {
    details.push({
      label: "Current Tools",
      value: <p className="text-sm font-medium whitespace-pre-wrap">{client.currentTools}</p>,
      icon: Clock,
    });
  }

  return (
    <div className="grid gap-4 sm:grid-cols-2">
      {details.map((detail) => {
        const Icon = detail.icon;
        return (
          <div key={detail.label} className="rounded-lg border border-slate-200 p-3">
            <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              {detail.label}
            </p>
            <div className="flex items-start gap-2">
              <Icon className="mt-0.5 h-4 w-4 text-muted-foreground" />
              <div>{detail.value}</div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

export function CompanyDetailsCard({ client }: { client: Client }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Company Details</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <CompanyDetailsGrid client={client} />
      </CardContent>
    </Card>
  );
}

export function RecentRequestsCard({
  requests,
  showWorkTab,
  clientId,
}: {
  requests: SupportRequest[];
  showWorkTab?: boolean;
  clientId?: string;
}) {
  if (showWorkTab && clientId) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Work</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            Block activity, subscribed tasks, and priced requests are on the{" "}
            <Link
              href={adminClientTabHref(clientId, "work")}
              className="text-primary hover:underline font-medium"
            >
              Work tab
            </Link>
            .
          </p>
        </CardContent>
      </Card>
    );
  }

  const clientRequests = requests.filter((r) => r.kind === "CLIENT_OPS");
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
            {clientRequests.map((request) => (
              <Link
                key={request.id}
                href={`/admin/requests/${request.id}`}
                className="flex items-center justify-between p-3 border rounded-lg hover:bg-slate-50 transition-colors"
              >
                <div>
                  <p className="font-medium text-sm">{request.title}</p>
                  <p className="text-xs text-muted-foreground">
                    {format(new Date(request.createdAt), "MMM d, yyyy")} •{" "}
                    {request.status.replace("_", " ")}
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

export function UsageCard({ client, usage }: { client: Client; usage: WeeklyUsage }) {
  return (
    <Card className="border-primary/20">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Clock className="h-5 w-5 text-primary" />
          Weekly Capacity
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="space-y-1">
            <p className="text-xs text-muted-foreground uppercase">Reserved</p>
            <p className="text-xl font-bold">{client.weeklyHours} hrs</p>
          </div>
          <div className="space-y-1">
            <p className="text-xs text-muted-foreground uppercase">Used</p>
            <p
              className={cn(
                "text-xl font-bold",
                usage.isOverLimit
                  ? "text-red-600"
                  : usage.isNearLimit
                    ? "text-orange-600"
                    : "text-green-600",
              )}
            >
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
              className={cn(
                "h-full transition-all",
                usage.isOverLimit
                  ? "bg-red-500"
                  : usage.isNearLimit
                    ? "bg-orange-500"
                    : "bg-primary",
              )}
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
            <span className="font-medium text-orange-600">
              {(usage.overflowMinutesThisWeek / 60).toFixed(1)} hrs
            </span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Non-billable:</span>
            <span className="font-medium">
              {(usage.nonBillableMinutesThisWeek / 60).toFixed(1)} hrs
            </span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export function SystemAccessCard({
  clientId,
  records,
}: {
  clientId: string;
  records: ClientSystemAccess[];
}) {
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

export function BrandingCard({ client }: { client: Client }) {
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

export function BillingCard({
  client,
}: {
  client: Client & {
    engagementType: EngagementType;
    billingOverrideCreatedBy?: { name: string | null; email: string } | null;
  };
}) {
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
              weeklyHours={client.weeklyHours}
              hourlyRateCents={client.hourlyRateCents}
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

export function PortalAccessCard({
  client,
}: {
  client: Client & {
    users: { id: string; email: string; name: string | null }[];
  };
}) {
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
          defaultEmail={client.email}
          defaultName={client.contactName}
          users={client.users}
        />
      </CardContent>
    </Card>
  );
}
