"use client";

import Link from "next/link";
import { format } from "date-fns";
import { CreditCard, Globe, Mail, MapPin, Phone, User } from "lucide-react";
import { ActivateClientButton } from "@/components/forms/ActivateClientButton";
import { ClientBillingManager } from "@/components/forms/ClientBillingManager";
import { ClientEngagementManager } from "@/components/admin/ClientEngagementManager";
import { ClientPortalAccessManager } from "@/components/forms/ClientPortalAccessManager";
import { ClientSystemAccessManager } from "@/components/forms/ClientSystemAccessManager";
import { buttonVariants } from "@/components/ui/button";
import {
  ClientStatus,
  ClientSystemAccess,
  EngagementType,
} from "@/generated/prisma/client";
import { ClientPlanType } from "@/lib/billing-options";
import { BillingMode } from "@/generated/prisma/client";
import { PRODUCT_LANGUAGE } from "@/lib/product-language";
import { cn, safeExternalHref } from "@/lib/utils";
import { useSetupGuide } from "./SetupGuideProvider";

type CatalogCategory = {
  id: string;
  name: string;
  tasks: { id: string; name: string }[];
};

export type AdminSetupSheetPanelsProps = {
  client: {
    id: string;
    companyName: string;
    contactName: string;
    email: string;
    phone: string | null;
    role: string | null;
    website: string | null;
    serviceArea: string | null;
    currentTools: string | null;
    status: ClientStatus;
    planType: string;
    engagementType: EngagementType;
    billingMode?: BillingMode | null;
    billingOverrideReason?: string | null;
    billingOverrideExpiresAt?: Date | null;
    billingOverrideCreatedAt?: Date | null;
    billingOverrideCreatedById?: string | null;
    billingOverrideCreatedByName?: string | null;
    billingOverrideCreatedByEmail?: string | null;
    subscriptionStatus?: string | null;
    stripeCustomerId?: string | null;
    stripeSubscriptionId?: string | null;
    subscriptionCurrentPeriodEnd?: Date | null;
    approvedWorkTaskCount: number;
    users: { id: string; email: string; name: string | null }[];
  };
  engagement: {
    approvedWorkTaskIds: string[];
    suggestedWorkTaskIds: string[];
    categories: CatalogCategory[];
    discoveryPlanRequestBased?: boolean;
  };
  systemAccessRecords: ClientSystemAccess[];
  adminRequestsHref: string;
};

export function AdminSetupSheetPanels({
  client,
  engagement,
  systemAccessRecords,
  adminRequestsHref,
}: AdminSetupSheetPanelsProps) {
  const { activeSheet } = useSetupGuide();
  if (!activeSheet) return null;

  const isActive = client.status === ClientStatus.ACTIVE;
  const isRequestBased = client.engagementType === EngagementType.REQUEST_BASED;

  switch (activeSheet) {
    case "activation":
      return (
        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Mark the company active after discovery, contract, and payment. Then configure
            billing and send a portal invite.
          </p>
          {isActive ? (
            <p className="text-sm font-medium text-emerald-700">Client is already active.</p>
          ) : (
            <ActivateClientButton clientId={client.id} />
          )}
        </div>
      );

    case "engagement":
      return (
        <ClientEngagementManager
          clientId={client.id}
          engagementType={client.engagementType}
          approvedWorkTaskIds={engagement.approvedWorkTaskIds}
          suggestedWorkTaskIds={engagement.suggestedWorkTaskIds}
          categories={engagement.categories}
          discoveryPlanRequestBased={engagement.discoveryPlanRequestBased}
        />
      );

    case "billing":
      return isRequestBased ? (
        <p className="text-sm text-muted-foreground leading-relaxed">
          Request-Based Work clients are priced per request after review.
        </p>
      ) : (
        <div className="space-y-4">
          {!isActive && (
            <p className="text-sm text-amber-800 rounded-md border border-amber-200 bg-amber-50 px-3 py-2">
              Activate the client before configuring subscription billing.
            </p>
          )}
          <ClientBillingManager
            clientId={client.id}
            engagementType={client.engagementType}
            billingMode={client.billingMode}
            billingOverrideReason={client.billingOverrideReason}
            billingOverrideExpiresAt={client.billingOverrideExpiresAt}
            billingOverrideCreatedAt={client.billingOverrideCreatedAt}
            billingOverrideCreatedById={client.billingOverrideCreatedById}
            billingOverrideCreatedByName={client.billingOverrideCreatedByName}
            billingOverrideCreatedByEmail={client.billingOverrideCreatedByEmail}
            currentPlan={client.planType as ClientPlanType}
            subscriptionStatus={client.subscriptionStatus ?? null}
            stripeCustomerId={client.stripeCustomerId ?? null}
            stripeSubscriptionId={client.stripeSubscriptionId ?? null}
          />
          {client.subscriptionCurrentPeriodEnd && (
            <p className="text-sm text-muted-foreground">
              Period end:{" "}
              <span className="font-medium text-foreground">
                {format(new Date(client.subscriptionCurrentPeriodEnd), "MMM d, yyyy")}
              </span>
            </p>
          )}
        </div>
      );

    case "system-access":
      return (
        <ClientSystemAccessManager clientId={client.id} records={systemAccessRecords} />
      );

    case "portal-invite":
      return (
        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">
            {client.users.length > 0
              ? `${client.users.length} portal user(s) linked.`
              : "Send a portal invite after activation and scope are ready."}
          </p>
          <ClientPortalAccessManager
            clientId={client.id}
            clientStatus={client.status}
            engagementType={client.engagementType}
            approvedWorkTaskCount={client.approvedWorkTaskCount}
            defaultEmail={client.email}
            defaultName={client.contactName}
            users={client.users}
          />
        </div>
      );

    case "client-details":
      return (
        <div className="space-y-4 text-sm">
          <DetailRow icon={User} label="Contact" value={client.contactName} sub={client.role} />
          <DetailRow icon={Mail} label="Email" value={client.email} />
          {client.phone && <DetailRow icon={Phone} label="Phone" value={client.phone} />}
          {client.website && (
            <div className="flex gap-3">
              <Globe className="mt-0.5 h-4 w-4 text-muted-foreground shrink-0" />
              <div>
                <a
                  href={safeExternalHref(client.website) ?? undefined}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="font-medium text-primary hover:underline"
                >
                  {client.website}
                </a>
                <p className="text-xs text-muted-foreground">Website</p>
              </div>
            </div>
          )}
          {client.serviceArea && (
            <DetailRow icon={MapPin} label="Service area" value={client.serviceArea} />
          )}
          {client.currentTools && (
            <DetailRow icon={CreditCard} label="Current tools" value={client.currentTools} multiline />
          )}
        </div>
      );

    case "work-requests":
      return (
        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Review {PRODUCT_LANGUAGE.workRequest.plural.toLowerCase()} submitted by this client.
          </p>
          <Link href={adminRequestsHref} className={cn(buttonVariants({ variant: "default" }))}>
            View all requests
          </Link>
        </div>
      );

    default:
      return (
        <p className="text-sm text-muted-foreground">
          Open this step from the guided setup rail or next-step card.
        </p>
      );
  }
}

function DetailRow({
  icon: Icon,
  label,
  value,
  sub,
  multiline,
}: {
  icon: typeof User;
  label: string;
  value: string;
  sub?: string | null;
  multiline?: boolean;
}) {
  return (
    <div className="flex gap-3">
      <Icon className="mt-0.5 h-4 w-4 text-muted-foreground shrink-0" />
      <div>
        <p className={cn("font-medium", multiline && "whitespace-pre-wrap")}>{value}</p>
        {sub && <p className="text-xs text-muted-foreground">{sub}</p>}
        {!sub && <p className="text-xs text-muted-foreground">{label}</p>}
      </div>
    </div>
  );
}
