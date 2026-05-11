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

export const dynamic = "force-dynamic";

interface AdminClientsPageProps {
  searchParams: Promise<{ status?: string }>;
}

export default async function AdminClients({ searchParams }: AdminClientsPageProps) {
  const { status } = await searchParams;
  const statusFilter =
    status === "LEAD" || status === "ACTIVE" || status === "ALL"
      ? status
      : "ACTIVE";

  const clients = await prisma.client.findMany({
    where:
      statusFilter === "ALL"
        ? undefined
        : { status: statusFilter as ClientStatus },
    orderBy: {
      companyName: "asc",
    },
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Clients</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Prospects stay off the portal until you activate them after contract and payment.
        </p>
      </div>

      <div className="flex flex-wrap gap-2">
        <FilterLink href="/admin/clients" active={statusFilter === "ACTIVE"}>
          Active clients
        </FilterLink>
        <FilterLink href="/admin/clients?status=LEAD" active={statusFilter === "LEAD"}>
          Prospects
        </FilterLink>
        <FilterLink href="/admin/clients?status=ALL" active={statusFilter === "ALL"}>
          All companies
        </FilterLink>
      </div>

      {clients.length === 0 ? (
        <div className="bg-white border rounded-lg p-12 text-center text-muted-foreground">
          {statusFilter === "LEAD"
            ? "No prospects yet. Inbound leads from the public form create prospect records here."
            : statusFilter === "ACTIVE"
              ? "No active clients yet. Activate a prospect after walkthrough, contract, and payment."
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
              {clients.map((client) => (
                <TableRow key={client.id}>
                  <TableCell className="font-medium">{client.companyName}</TableCell>
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
              ))}
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
