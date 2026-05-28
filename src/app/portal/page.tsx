import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { calculateWeeklyUsage } from "@/lib/usage";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { 
  Clock, 
  ClipboardList, 
  AlertCircle, 
  TrendingUp,
  PlusCircle,
  UserCircle,
  Inbox,
  ArrowRight,
  KeyRound,
} from "lucide-react";
import Link from "next/link";
import { format, startOfWeek } from "date-fns";
import { cn } from "@/lib/utils";
import { buttonVariants } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { StatusBadge } from "@/components/ui/status-badge";
import { EngagementType, SystemAccessStatus } from "@/generated/prisma/client";
import { PRODUCT_LANGUAGE } from "@/lib/product-language";
import { getRequestPricingState } from "@/lib/engagement";
import { getClientPortalSupportSetup } from "@/lib/portal-support";
import { getClientSetupReadiness } from "@/lib/client-setup-readiness";
import { PortalSetupGuide } from "@/components/portal/PortalSetupGuide";
import { getClientDiscoveryRequest } from "@/lib/portal-discovery";
import { getPublicDiscoveryCatalog } from "@/lib/discovery-catalog";
import { YourDiscoveryRequest } from "@/components/portal/YourDiscoveryCallRequest";

export const dynamic = "force-dynamic";

export default async function PortalDashboard() {
  const session = await auth();
  const clientId = session?.user?.clientId;

  if (!clientId) {
    // This should be handled by layout, but for safety:
    return <div>Client not found.</div>;
  }

  const client = await prisma.client.findUnique({
    where: { id: clientId },
    include: {
      requests: {
        orderBy: { updatedAt: "desc" },
        take: 5
      },
      timeEntries: {
        where: {
          date: {
            gte: startOfWeek(new Date(), { weekStartsOn: 1 })
          }
        }
      },
    }
  });

  if (!client) {
    return <div>Client not found.</div>;
  }

  const supportSetup = await getClientPortalSupportSetup(clientId);
  const setupReadinessResult = await getClientSetupReadiness(clientId);
  const discovery = await getClientDiscoveryRequest(clientId);
  const discoveryCatalog = discovery ? await getPublicDiscoveryCatalog() : [];
  const setupBlocked = !("error" in supportSetup) && !supportSetup.canSubmit;

  const isSupportBlock = client.engagementType === EngagementType.SUPPORT_BLOCK;
  const isRequestBased = client.engagementType === EngagementType.REQUEST_BASED;
  const usage = calculateWeeklyUsage(client.timeEntries, client.weeklyHours);

  const openRequestsCount = await prisma.supportRequest.count({
    where: { 
      clientId,
      status: { notIn: ["COMPLETE", "CANCELLED"] }
    }
  });

  const needsInfoRequests = await prisma.supportRequest.findMany({
    where: { 
      clientId,
      OR: [
        { status: "NEEDS_INFO" },
        { needsInfo: true }
      ]
    },
    orderBy: { updatedAt: "desc" }
  });

  const needsInfoCount = needsInfoRequests.length;

  const pendingPricingRequests = isRequestBased
    ? client.requests.filter((r) => {
        const state = getRequestPricingState(r);
        return state === "pending_review" || state === "invalid";
      })
    : [];

  const supportSetupOk = !("error" in supportSetup);
  const blockReasonCode =
    supportSetupOk && !supportSetup.canSubmit ? supportSetup.blockReasonCode : undefined;
  const paymentBlocked = isSupportBlock && blockReasonCode === "payment_not_made";
  const agreementBlocked = blockReasonCode === "agreement_pending";
  const primaryHref = paymentBlocked
    ? "/portal/account#support-setup"
    : "/portal/requests/new";
  const primaryLabel = paymentBlocked
    ? "Set up payment"
    : PRODUCT_LANGUAGE.workRequest.action;
  const primaryDisabled = setupBlocked && !paymentBlocked && !agreementBlocked;

  const pendingAccessCount = await prisma.clientSystemAccess.count({
    where: {
      clientId,
      status: SystemAccessStatus.NOT_PROVIDED,
      createdViaPortal: false,
    },
  });

  const stats = isSupportBlock
    ? [
        { title: "Open work", value: openRequestsCount.toString(), icon: ClipboardList, color: "text-blue-600", bg: "bg-blue-50" },
        { title: "Needs info", value: needsInfoCount.toString(), icon: AlertCircle, color: "text-orange-600", bg: "bg-orange-50" },
        { title: "Included hours (week)", value: (usage.includedMinutesThisWeek / 60).toFixed(1), icon: Clock, color: "text-green-600", bg: "bg-green-50" },
      ]
    : [
        { title: "Open work", value: openRequestsCount.toString(), icon: ClipboardList, color: "text-blue-600", bg: "bg-blue-50" },
        { title: "Needs info", value: needsInfoCount.toString(), icon: AlertCircle, color: "text-orange-600", bg: "bg-orange-50" },
        { title: "Awaiting pricing", value: pendingPricingRequests.length.toString(), icon: Clock, color: "text-amber-600", bg: "bg-amber-50" },
      ];

  return (
    <div className="space-y-8">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Your Hargen Energy Solar Ops Desk</h1>
          <p className="text-muted-foreground">
            {client.companyName} •{" "}
            {isSupportBlock
              ? `${client.planType} ${PRODUCT_LANGUAGE.engagement.supportBlock}`
              : PRODUCT_LANGUAGE.engagement.requestBased}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {primaryDisabled ? (
            <span
              className={cn(
                buttonVariants({ variant: "default" }),
                "flex items-center gap-2 opacity-50 pointer-events-none",
              )}
              aria-disabled
            >
              <PlusCircle className="h-4 w-4" />
              {PRODUCT_LANGUAGE.workRequest.action}
            </span>
          ) : (
            <Link
              href={primaryHref}
              className={cn(buttonVariants({ variant: "default" }), "flex items-center gap-2")}
            >
              <PlusCircle className="h-4 w-4" />
              {primaryLabel}
            </Link>
          )}
          <Link
            href="/portal/access"
            className={cn(buttonVariants({ variant: "outline" }), "flex items-center gap-2")}
          >
            <KeyRound className="h-4 w-4" />
            Share access
            {pendingAccessCount > 0 && (
              <Badge variant="secondary" className="ml-1">
                {pendingAccessCount}
              </Badge>
            )}
          </Link>
        </div>
      </div>

      {isRequestBased && (
        <p className="text-sm text-muted-foreground leading-relaxed -mt-4">
          Send work as needed. Hargen reviews each request and confirms pricing before work
          continues.
        </p>
      )}

      {setupBlocked && supportSetupOk && (
        <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-amber-900 text-sm -mt-4">
          <p className="font-semibold">{PRODUCT_LANGUAGE.supportSetup.blockedSubmitTitle}</p>
          <p className="mt-2">
            {supportSetup.blockMessage ??
              "Your account is still being configured. Hargen will notify you when you can send work."}
          </p>
          {(paymentBlocked || isSupportBlock) && (
            <Link
              href="/portal/account#support-setup"
              className="mt-3 inline-block text-sm font-medium text-amber-900 underline underline-offset-2"
            >
              {paymentBlocked
                ? "Set up payment"
                : PRODUCT_LANGUAGE.supportSetup.viewSetupLink}
            </Link>
          )}
          {agreementBlocked && (
            <p className="mt-4 text-xs text-amber-800/90">
              {PRODUCT_LANGUAGE.supportSetup.agreementContactPrompt}
            </p>
          )}
          {!isRequestBased && blockReasonCode === "scope_not_configured" && (
            <p className="mt-4 text-xs text-amber-800/90">
              {PRODUCT_LANGUAGE.supportSetup.changeScopePrompt}
            </p>
          )}
          {supportSetupOk &&
            !supportSetup.canSubmit &&
            supportSetup.allSubmitBlockers &&
            supportSetup.allSubmitBlockers.length > 1 && (
              <ul className="mt-3 list-disc pl-5 text-xs text-amber-800/90 space-y-1">
                {supportSetup.allSubmitBlockers.slice(1).map((blocker) => (
                  <li key={blocker.reasonCode}>{blocker.message}</li>
                ))}
              </ul>
            )}
        </div>
      )}

      {/* Action Needed Section */}
      {needsInfoCount > 0 && (
        <div className="space-y-4">
          <h2 className="text-sm font-bold text-orange-800 uppercase tracking-wider flex items-center gap-2">
            <AlertCircle className="h-4 w-4" />
            Action Needed ({needsInfoCount})
          </h2>
          <div className="grid grid-cols-1 gap-3">
            {needsInfoRequests.map((request) => (
              <div 
                key={request.id}
                className="flex items-center justify-between p-4 bg-orange-50 border border-orange-200 rounded-xl shadow-sm"
              >
                <div className="flex items-start gap-3">
                  <div className="mt-1 p-2 bg-white rounded-full text-orange-600 shadow-sm">
                    <AlertCircle className="h-4 w-4" />
                  </div>
                  <div>
                    <p className="text-sm font-bold text-orange-900">{request.title}</p>
                    <p className="text-xs text-orange-700 mt-0.5">We need more information to proceed with this request.</p>
                  </div>
                </div>
                <Link 
                  href={`/portal/requests/${request.id}`}
                  className={cn(
                    buttonVariants({ variant: "default", size: "sm" }), 
                    "bg-orange-600 hover:bg-orange-700 text-white border-none"
                  )}
                >
                  Resolve Now
                  <ArrowRight className="ml-2 h-3.5 w-3.5" />
                </Link>
              </div>
            ))}
          </div>
        </div>
      )}

      {discovery && (
        <YourDiscoveryRequest discovery={discovery} catalog={discoveryCatalog} />
      )}

      {!("error" in setupReadinessResult) && (
        <PortalSetupGuide
          readiness={setupReadinessResult}
          setup={"error" in supportSetup ? null : supportSetup}
          discovery={discovery}
        />
      )}

      {isRequestBased && pendingPricingRequests.length > 0 && (
        <Card className="border-amber-200 bg-amber-50/40">
          <CardHeader>
            <CardTitle className="text-lg text-amber-900">Pricing review in progress</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {pendingPricingRequests.map((r) => (
              <Link
                key={r.id}
                href={`/portal/requests/${r.id}`}
                className="block text-sm text-amber-900 hover:underline"
              >
                {r.title} — {PRODUCT_LANGUAGE.engagement.pricingPending}
              </Link>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Capacity Card — block clients only */}
      {isSupportBlock && (
      <Card className="border-primary/20 bg-primary/[0.02]">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <TrendingUp className="h-5 w-5 text-primary" />
            Weekly Support Capacity
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <p className="text-xs text-muted-foreground uppercase font-semibold">Reserved</p>
                  <p className="text-2xl font-bold">{client.weeklyHours} hrs</p>
                </div>
                <div className="space-y-1">
                  <p className="text-xs text-muted-foreground uppercase font-semibold">Used</p>
                  <p className={cn("text-2xl font-bold", usage.isOverLimit ? "text-red-600" : usage.isNearLimit ? "text-orange-600" : "text-slate-900")}>
                    {(usage.includedMinutesThisWeek / 60).toFixed(1)} hrs
                  </p>
                </div>
              </div>
              <div className="space-y-2">
                <div className="flex justify-between text-xs font-medium">
                  <span>Included Usage</span>
                  <span>{usage.percentUsed.toFixed(0)}%</span>
                </div>
                <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden">
                  <div 
                    className={cn("h-full transition-all", usage.isOverLimit ? "bg-red-500" : usage.isNearLimit ? "bg-orange-500" : "bg-primary")} 
                    style={{ width: `${Math.min(usage.percentUsed, 100)}%` }}
                  />
                </div>
              </div>
            </div>

            <div className="md:border-l md:pl-8 space-y-3">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Remaining:</span>
                <span className="font-bold">{(usage.remainingIncludedMinutes / 60).toFixed(1)} hrs</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Overflow logged:</span>
                <span className="font-medium text-orange-600">{(usage.overflowMinutesThisWeek / 60).toFixed(1)} hrs</span>
              </div>
              <p className="text-[10px] text-muted-foreground mt-2 italic">
                * Support blocks reset every Monday. Overflow time requires separate approval.
              </p>
            </div>

            <div className="md:border-l md:pl-8 flex flex-col justify-center">
              {usage.isOverLimit ? (
                <div className="p-3 bg-red-50 border border-red-100 rounded-md">
                  <p className="text-xs font-bold text-red-800">Capacity Alert</p>
                  <p className="text-[10px] text-red-700 mt-1">You have exceeded your weekly reserved hours. Additional work will be tracked as overflow or deferred.</p>
                </div>
              ) : usage.isNearLimit ? (
                <div className="p-3 bg-orange-50 border border-orange-100 rounded-md">
                  <p className="text-xs font-bold text-orange-800">Near Limit</p>
                  <p className="text-[10px] text-orange-700 mt-1">You are approaching your weekly limit. We will prioritize high-impact work first.</p>
                </div>
              ) : (
                <div className="p-3 bg-green-50 border border-green-100 rounded-md">
                  <p className="text-xs font-bold text-green-800">Healthy Capacity</p>
                  <p className="text-[10px] text-green-700 mt-1">Your weekly support block is active and ready for more requests.</p>
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {stats.map((stat) => (
          <Card key={stat.title}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                {stat.title}
              </CardTitle>
              <div className={`${stat.bg} p-2 rounded-md`}>
                <stat.icon className={`h-4 w-4 ${stat.color}`} />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stat.value}</div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>{PRODUCT_LANGUAGE.workRequest.recentSectionTitle}</CardTitle>
            <Link href="/portal/requests" className="text-xs text-primary hover:underline font-medium">{PRODUCT_LANGUAGE.workRequest.viewAllLabel}</Link>
          </CardHeader>
          <CardContent>
            {client.requests.length === 0 ? (
              <EmptyState
                icon={Inbox}
                title={PRODUCT_LANGUAGE.workRequest.emptyTitle}
                description={
                  primaryDisabled
                    ? "Your account is still being set up. You can send work once activation is complete."
                    : PRODUCT_LANGUAGE.workRequest.emptyBody
                }
                action={
                  primaryDisabled
                    ? undefined
                    : {
                        label: primaryLabel,
                        href: primaryHref,
                      }
                }
              />
            ) : (
              <div className="space-y-4">
                {client.requests.map((request) => (
                  <Link 
                    key={request.id} 
                    href={`/portal/requests/${request.id}`}
                    className="flex items-center justify-between p-3 border rounded-lg hover:bg-slate-50 transition-colors"
                  >
                    <div>
                      <p className="font-medium text-sm truncate max-w-[200px]">{request.title}</p>
                      <p className="text-xs text-muted-foreground">{format(new Date(request.updatedAt), "MMM d, yyyy")}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      {(request.status === "NEEDS_INFO" || request.needsInfo) && (
                        <Badge variant="destructive" className="text-[10px] px-1 py-0 h-4">Action Needed</Badge>
                      )}
                      <StatusBadge status={request.status} />
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Quick Actions</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 gap-3">
              {primaryDisabled ? (
                <div className="flex items-center justify-between p-4 border rounded-lg opacity-50">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-primary/10 rounded text-primary">
                      <PlusCircle className="h-5 w-5" />
                    </div>
                    <div>
                      <p className="text-sm font-bold">{PRODUCT_LANGUAGE.workRequest.action}</p>
                      <p className="text-xs text-muted-foreground">Available once setup is complete.</p>
                    </div>
                  </div>
                </div>
              ) : (
                <Link
                  href={primaryHref}
                  className="flex items-center justify-between p-4 border rounded-lg hover:bg-slate-50 transition-colors group"
                >
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-primary/10 rounded text-primary group-hover:bg-primary group-hover:text-white transition-colors">
                      <PlusCircle className="h-5 w-5" />
                    </div>
                    <div>
                      <p className="text-sm font-bold">{primaryLabel}</p>
                      <p className="text-xs text-muted-foreground">
                        {paymentBlocked
                          ? "Complete billing to send your first request."
                          : "Tell us where you're stuck."}
                      </p>
                    </div>
                  </div>
                  <ChevronRight className="h-4 w-4 text-muted-foreground" />
                </Link>
              )}

              <Link
                href="/portal/access"
                className="flex items-center justify-between p-4 border rounded-lg hover:bg-slate-50 transition-colors group"
              >
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-slate-100 rounded text-slate-600 group-hover:bg-slate-900 group-hover:text-white transition-colors">
                    <KeyRound className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="text-sm font-bold">Share access</p>
                    <p className="text-xs text-muted-foreground">
                      Optional — share AHJ, utility, and CRM logins.
                      {pendingAccessCount > 0
                        ? ` ${pendingAccessCount} pending.`
                        : ""}
                    </p>
                  </div>
                </div>
                <ChevronRight className="h-4 w-4 text-muted-foreground" />
              </Link>
              <Link 
                href="/portal/account" 
                className="flex items-center justify-between p-4 border rounded-lg hover:bg-slate-50 transition-colors group"
              >
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-slate-100 rounded text-slate-600 group-hover:bg-slate-900 group-hover:text-white transition-colors">
                    <UserCircle className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="text-sm font-bold">Account Settings</p>
                    <p className="text-xs text-muted-foreground">View company and plan details.</p>
                  </div>
                </div>
                <ChevronRight className="h-4 w-4 text-muted-foreground" />
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function ChevronRight({ className }: { className?: string }) {
  return (
    <svg 
      xmlns="http://www.w3.org/2000/svg" 
      width="24" 
      height="24" 
      viewBox="0 0 24 24" 
      fill="none" 
      stroke="currentColor" 
      strokeWidth="2" 
      strokeLinecap="round" 
      strokeLinejoin="round" 
      className={className}
    >
      <path d="m9 18 6-6-6-6"/>
    </svg>
  );
}
