import { prisma } from "@/lib/prisma";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import {
  Urgency,
  OverflowStatus,
  SupportRequestKind,
  RequestStatus,
} from "@/generated/prisma/client";
import {
  getEngagementLabel,
  getRequestPricingState,
  getRequestPricingStateLabel,
} from "@/lib/engagement";
import { PRODUCT_LANGUAGE } from "@/lib/product-language";
import { PriorityButtons } from "@/components/admin/PriorityButtons";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  adminBtnPrimary,
} from "@/lib/admin-ui/tokens";
import {
  requestStatusBadgeClass,
  rankToPriorityLabel,
  priorityRankBadgeClass,
  formatAge,
} from "@/lib/admin-ui/status-badges";
import { EmptyState } from "@/components/ui/empty-state";
import { Wrench } from "lucide-react";
import { getClientServicePaths } from "@/lib/client-service-model";

export const dynamic = "force-dynamic";

type FilterKey = "all" | "new" | "in_progress" | "needs_info";

interface AdminRequestsPageProps {
  searchParams: Promise<{ filter?: string }>;
}

function buildWhereClause(filter: FilterKey) {
  const base = { kind: SupportRequestKind.CLIENT_OPS };
  switch (filter) {
    case "new":
      return { ...base, status: RequestStatus.NEW };
    case "in_progress":
      return { ...base, status: RequestStatus.IN_PROGRESS };
    case "needs_info":
      return { ...base, needsInfo: true };
    default:
      return base;
  }
}

function urgencyBadgeClass(urgency: Urgency): string {
  switch (urgency) {
    case Urgency.URGENT:
      return "border-red-200 bg-red-50 text-red-800";
    case Urgency.THIS_WEEK:
      return "border-amber-200 bg-amber-50 text-amber-900";
    case Urgency.NORMAL:
      return "border-slate-200 bg-slate-50 text-slate-700";
    case Urgency.ONGOING:
      return "border-slate-200 bg-white text-slate-500";
    default:
      return "border-slate-200 bg-white text-slate-600";
  }
}

export default async function AdminRequests({ searchParams }: AdminRequestsPageProps) {
  const { filter: filterParam } = await searchParams;
  const filter: FilterKey =
    filterParam === "new" ||
    filterParam === "in_progress" ||
    filterParam === "needs_info"
      ? filterParam
      : "all";

  const [requests, counts] = await Promise.all([
    prisma.supportRequest.findMany({
      where: buildWhereClause(filter),
      include: {
        client: {
          include: {
            serviceModels: { select: { modelType: true, isActive: true } },
          },
        },
        timeEntries: { select: { minutes: true } },
      },
      orderBy: [{ priorityRank: "asc" }, { createdAt: "desc" }],
    }),
    // Parallel count queries for filter tabs
    Promise.all([
      prisma.supportRequest.count({
        where: { kind: SupportRequestKind.CLIENT_OPS },
      }),
      prisma.supportRequest.count({
        where: { kind: SupportRequestKind.CLIENT_OPS, status: RequestStatus.NEW },
      }),
      prisma.supportRequest.count({
        where: {
          kind: SupportRequestKind.CLIENT_OPS,
          status: RequestStatus.IN_PROGRESS,
        },
      }),
      prisma.supportRequest.count({
        where: { kind: SupportRequestKind.CLIENT_OPS, needsInfo: true },
      }),
    ]),
  ]);

  const [allCount, newCount, inProgressCount, needsInfoCount] = counts;

  const filterTabs: { key: FilterKey; label: string; count: number; href: string }[] =
    [
      { key: "all", label: "All", count: allCount, href: "/admin/requests" },
      {
        key: "new",
        label: "New",
        count: newCount,
        href: "/admin/requests?filter=new",
      },
      {
        key: "in_progress",
        label: "In progress",
        count: inProgressCount,
        href: "/admin/requests?filter=in_progress",
      },
      {
        key: "needs_info",
        label: "Needs info",
        count: needsInfoCount,
        href: "/admin/requests?filter=needs_info",
      },
    ];

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">
            {PRODUCT_LANGUAGE.workRequest.listTitle}
          </h1>
          <p className="mt-0.5 text-sm text-slate-600">
            Prioritized delivery queue across all active clients.
          </p>
        </div>
      </div>

      {/* Filter tabs */}
      <div className="flex flex-wrap gap-1.5">
        {filterTabs.map((tab) => (
          <Link
            key={tab.key}
            href={tab.href}
            className={cn(
              "flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-sm font-medium transition-colors",
              filter === tab.key
                ? "border-slate-900 bg-slate-900 text-white"
                : "border-slate-200 text-slate-600 hover:bg-slate-50 hover:text-slate-900",
            )}
          >
            {tab.label}
            <span
              className={cn(
                "rounded-full px-1.5 py-0.5 text-[10px] font-semibold leading-none",
                filter === tab.key
                  ? "bg-white/20 text-white"
                  : "bg-slate-100 text-slate-600",
              )}
            >
              {tab.count}
            </span>
          </Link>
        ))}
      </div>

      {requests.length === 0 ? (
        <EmptyState
          icon={Wrench}
          title={`No ${filter === "all" ? "" : filter.replace("_", " ") + " "}requests`}
          description={
            filter === "all"
              ? "Portal submissions and logged off-channel work will appear here."
              : `No requests match this filter right now.`
          }
          action={{ label: "View All Requests", href: "/admin/requests" }}
        />
      ) : (
        <>
          <div className="space-y-3 md:hidden">
            {requests.map((request) => {
              const totalMinutes = request.timeEntries.reduce(
                (acc, curr) => acc + curr.minutes,
                0,
              );
              const priorityLabel = rankToPriorityLabel(request.priorityRank);
              const priorityClass = priorityRankBadgeClass(request.priorityRank);
              const statusClass = requestStatusBadgeClass(request.status);
              const urg = urgencyBadgeClass(request.urgency);

              return (
                <div
                  key={`mobile-${request.id}`}
                  className="rounded-xl border border-slate-200 bg-white p-3"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold text-slate-900">
                        {request.title}
                      </p>
                      <p className="truncate text-xs text-slate-500">
                        {request.client.companyName} - {request.client.contactName}
                      </p>
                    </div>
                    <Link
                      href={`/admin/requests/${request.id}`}
                      className={cn(
                        buttonVariants({ size: "sm" }),
                        adminBtnPrimary,
                        "h-8 text-xs",
                      )}
                    >
                      Open
                    </Link>
                  </div>
                  <div className="mt-3 flex flex-wrap items-center gap-2">
                    <Badge
                      variant="outline"
                      className={cn("text-[10px] font-semibold", priorityClass)}
                    >
                      {priorityLabel}
                    </Badge>
                    <PriorityButtons
                      requestId={request.id}
                      currentPriority={request.priorityRank}
                    />
                    <Badge
                      variant="outline"
                      className={cn("text-[10px] font-medium uppercase", urg)}
                    >
                      {request.urgency.replace(/_/g, " ")}
                    </Badge>
                    <Badge
                      variant="outline"
                      className={cn("text-[10px] font-medium", statusClass)}
                    >
                      {request.status.replace(/_/g, " ")}
                    </Badge>
                  </div>
                  <div className="mt-3 flex items-center justify-between text-xs text-slate-500">
                    <span>{totalMinutes > 0 ? `${totalMinutes}m logged` : "0m logged"}</span>
                    <span>{formatAge(request.createdAt)}</span>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="hidden overflow-hidden rounded-xl border border-slate-200 bg-white md:block">
            <div className="overflow-x-auto">
              <table className="min-w-[980px] w-full text-sm">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50/70">
                <th className="w-[100px] px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Priority
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Company
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Request
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Urgency
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Status
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Time
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Age
                </th>
                <th className="w-20 px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {requests.map((request) => {
                const totalMinutes = request.timeEntries.reduce(
                  (acc, curr) => acc + curr.minutes,
                  0,
                );
                const priorityLabel = rankToPriorityLabel(request.priorityRank);
                const priorityClass = priorityRankBadgeClass(request.priorityRank);
                const statusClass = requestStatusBadgeClass(request.status);
                const urg = urgencyBadgeClass(request.urgency);
                const servicePaths = getClientServicePaths(request.client);
                const pricingState =
                  servicePaths.hasFixedFee
                    ? getRequestPricingState(request)
                    : null;

                return (
                  <tr
                    key={request.id}
                    className="group cursor-pointer transition-colors hover:bg-slate-50/70"
                  >
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <Badge
                          variant="outline"
                          className={cn(
                            "w-fit text-[10px] font-semibold",
                            priorityClass,
                          )}
                        >
                          {priorityLabel}
                        </Badge>
                        <PriorityButtons
                          requestId={request.id}
                          currentPriority={request.priorityRank}
                        />
                      </div>
                    </td>

                    <td className="px-4 py-3">
                      <div className="relative">
                        <Link
                          href={`/admin/requests/${request.id}`}
                          className="absolute inset-0 z-0"
                          aria-hidden="true"
                          tabIndex={-1}
                        />
                        <p className="relative z-10 font-semibold text-slate-900">
                          {request.client.companyName}
                        </p>
                        <p className="relative z-10 text-[10px] uppercase tracking-tight text-slate-400">
                          {request.client.contactName}
                        </p>
                        <Badge
                          variant="outline"
                          className="relative z-10 mt-0.5 text-[9px]"
                        >
                          {getEngagementLabel(request.client.engagementType)}
                        </Badge>
                      </div>
                    </td>

                    <td className="px-4 py-3">
                      <div className="flex items-start gap-1.5">
                        <Link
                          href={`/admin/requests/${request.id}`}
                          className="relative z-10 max-w-[220px] truncate text-sm font-medium text-slate-900 hover:underline"
                        >
                          {request.title}
                        </Link>
                        {request.needsInfo && (
                          <Badge
                            variant="outline"
                            className="shrink-0 border-amber-200 bg-amber-50 text-[9px] text-amber-900"
                          >
                            Needs Info
                          </Badge>
                        )}
                      </div>
                    </td>

                    <td className="px-4 py-3">
                      <Badge
                        variant="outline"
                        className={cn("text-[10px] font-medium uppercase", urg)}
                      >
                        {request.urgency.replace(/_/g, " ")}
                      </Badge>
                    </td>

                    <td className="px-4 py-3">
                      <div className="flex flex-col gap-1">
                        <Badge
                          variant="outline"
                          className={cn(
                            "w-fit text-[10px] font-medium",
                            statusClass,
                          )}
                        >
                          {request.status.replace(/_/g, " ")}
                        </Badge>
                        {request.overflowStatus !== OverflowStatus.NOT_NEEDED && (
                          <Badge
                            variant="outline"
                            className="w-fit text-[10px]"
                          >
                            {request.overflowStatus.replace(/_/g, " ")}
                          </Badge>
                        )}
                        {servicePaths.hasFixedFee && request.handoffTier && (
                            <Badge variant="secondary" className="w-fit text-[10px]">
                              {request.handoffTier}
                            </Badge>
                          )}
                        {servicePaths.hasFixedFee && (
                          <Badge
                            variant={pricingState === "fixed_fee_ready" ? "default" : "outline"}
                            className="w-fit text-[10px]"
                          >
                            {getRequestPricingStateLabel(pricingState ?? "pending_review")}
                          </Badge>
                        )}
                      </div>
                    </td>

                    <td className="px-4 py-3">
                      <span
                        className={cn(
                          "text-sm font-semibold",
                          totalMinutes > 0 ? "text-slate-900" : "text-slate-400",
                        )}
                      >
                        {totalMinutes > 0 ? `${totalMinutes}m` : "0m"}
                      </span>
                    </td>

                    <td className="px-4 py-3 text-xs text-slate-500">
                      {formatAge(request.createdAt)}
                    </td>

                    <td className="px-4 py-3 text-right">
                      <Link
                        href={`/admin/requests/${request.id}`}
                        className={cn(
                          buttonVariants({ size: "sm" }),
                          adminBtnPrimary,
                          "relative z-10 h-7 text-xs",
                        )}
                      >
                        Open
                      </Link>
                    </td>
                  </tr>
                );
              })}
            </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
