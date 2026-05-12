import { prisma } from "@/lib/prisma";
import { format } from "date-fns";
import { Badge } from "@/components/ui/badge";
import Link from "next/link";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ClientStatus } from "@/generated/prisma/client";
import { cn } from "@/lib/utils";
import { PRODUCT_LANGUAGE } from "@/lib/product-language";

export const dynamic = "force-dynamic";

interface AdminClientsPageProps {
  searchParams: Promise<{ status?: string; needsReview?: string }>;
}

export default async function AdminClients({ searchParams }: AdminClientsPageProps) {
  const { status, needsReview } = await searchParams;
  const statusFilter =
    status === "LEAD" || status === "ACTIVE" || status === "ALL"
      ? status
      : "LEAD"; // Default to prospects/onboarding
  const needsReviewFilter = needsReview === "1";

  const clients = await prisma.client.findMany({
    where:
      statusFilter === "ALL"
        ? needsReviewFilter
          ? {
              requests: {
                some: {
                  kind: "PROSPECT_INTAKE",
                  status: "NEW",
                },
              },
            }
          : undefined
        : needsReviewFilter
          ? {
              status: statusFilter as ClientStatus,
              requests: {
                some: {
                  kind: "PROSPECT_INTAKE",
                  status: "NEW",
                },
              },
            }
          : { status: statusFilter as ClientStatus },
    include: {
      requests: {
        where: { kind: "PROSPECT_INTAKE" },
        orderBy: { createdAt: "desc" },
        take: 1,
        select: { id: true, title: true, status: true },
      },
    },
    orderBy: {
      updatedAt: "desc",
    },
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Clients</h1>
        <p className="text-sm text-muted-foreground mt-1">
          {PRODUCT_LANGUAGE.prospect.listSubtitle}
        </p>
      </div>

      <div className="flex flex-wrap gap-2">
        <FilterLink href="/admin/clients" active={statusFilter === "LEAD"}>
          Onboarding ({PRODUCT_LANGUAGE.prospect.plural})
        </FilterLink>
        <FilterLink href="/admin/clients?status=ACTIVE" active={statusFilter === "ACTIVE"}>
          Active {PRODUCT_LANGUAGE.client.plural}
        </FilterLink>
        <FilterLink href="/admin/clients?status=ALL" active={statusFilter === "ALL"}>
          All Companies
        </FilterLink>
      </div>

      {clients.length === 0 ? (
        <div className="bg-white border rounded-lg p-12 text-center text-muted-foreground">
          {statusFilter === "LEAD"
            ? `No ${PRODUCT_LANGUAGE.prospect.plural.toLowerCase()} yet. ${PRODUCT_LANGUAGE.walkthrough.plural} create ${PRODUCT_LANGUAGE.prospect.plural.toLowerCase()} automatically when submitted via the public form.`
            : statusFilter === "ACTIVE"
              ? `No active ${PRODUCT_LANGUAGE.client.plural.toLowerCase()} yet. Activate a ${PRODUCT_LANGUAGE.prospect.singular.toLowerCase()} after walkthrough, contract, and payment.`
              : "No companies yet."}
        </div>
      ) : (
        <div className="bg-white border rounded-lg overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Company</TableHead>
                <TableHead>Contact</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Plan</TableHead>
                <TableHead>Subscription</TableHead>
                <TableHead>Created</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {clients.map((client) => {
                const hasUnreviewedWalkthrough = client.requests[0]?.status === "NEW";
                return (
                  <TableRow key={client.id}>
                    <TableCell className="font-medium">
                      <div className="flex items-center gap-2">
                        {client.companyName}
                        {hasUnreviewedWalkthrough && (
                          <Badge variant="destructive" className="text-[10px] px-1.5 py-0">
                            Needs review
                          </Badge>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>{client.contactName}</TableCell>
                    <TableCell>
                      <Badge variant={client.status === ClientStatus.ACTIVE ? "default" : "secondary"}>
                        {client.status === ClientStatus.ACTIVE ? "Active" : "Prospect"}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant="secondary">{client.planType}</Badge>
                    </TableCell>
                    <TableCell>
                      {client.subscriptionStatus ? (
                        <Badge variant={client.subscriptionStatus === "active" ? "default" : "destructive"}>
                          {client.subscriptionStatus}
                        </Badge>
                      ) : (
                        <span className="text-xs text-muted-foreground italic">No subscription</span>
                      )}
                    </TableCell>
                    <TableCell className="text-muted-foreground text-sm">
                      {format(new Date(client.createdAt), "MMM d, yyyy")}
                    </TableCell>
                    <TableCell className="text-right">
                      <Link
                        href={`/admin/clients/${client.id}`}
                        className="text-primary hover:underline text-sm font-medium"
                      >
                        Manage
                      </Link>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}

function FilterLink({
  href,
  active,
  children,
}: {
  href: string;
  active: boolean;
  children: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      className={cn(
        "rounded-md border px-3 py-1.5 text-sm font-medium transition-colors",
        active
          ? "border-primary bg-primary/5 text-primary"
          : "border-slate-200 text-slate-600 hover:bg-slate-50",
      )}
    >
      {children}
    </Link>
  );
}
