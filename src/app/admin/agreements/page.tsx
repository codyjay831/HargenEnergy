import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { ensureDefaultLegalTemplates } from "@/lib/agreements/ensure-templates";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  PACKET_STATUS_LABELS,
  packetStatusBadgeClass,
} from "@/lib/agreements/status";
import { adminAgreementPacketUrl, adminAgreementsUrl } from "@/lib/app-url";
import { adminBtnPrimary } from "@/lib/admin-ui/tokens";
import { format } from "date-fns";
import { adminClientTabHref } from "@/lib/admin-client-tabs";
import { cn } from "@/lib/utils";

export const dynamic = "force-dynamic";

type AgreementsPageProps = {
  searchParams: Promise<{ clientId?: string }>;
};

export default async function AdminAgreementsPage({
  searchParams,
}: AgreementsPageProps) {
  await ensureDefaultLegalTemplates();
  const { clientId } = await searchParams;

  const packets = await prisma.agreementPacket.findMany({
    where: clientId ? { clientId } : undefined,
    include: {
      client: { select: { id: true, companyName: true } },
      clientServicesTemplate: { select: { version: true } },
      workAuthorizationTemplate: { select: { version: true } },
    },
    orderBy: { createdAt: "desc" },
    take: 100,
  });

  const filteredClient = clientId
    ? await prisma.client.findUnique({
        where: { id: clientId },
        select: { companyName: true },
      })
    : null;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Agreement Packets</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Generate Client Services Agreement + Work Authorization packets for clients.
          </p>
          {filteredClient && (
            <p className="text-sm text-slate-700 mt-2">
              Filtered to{" "}
              <Link
                href={adminClientTabHref(clientId!, "overview")}
                className="font-medium text-emerald-700 hover:underline"
              >
                {filteredClient.companyName}
              </Link>
              {" · "}
              <Link href={adminAgreementsUrl()} className="text-slate-500 hover:underline">
                Show all
              </Link>
            </p>
          )}
        </div>
        <Link
          href={`/admin/agreements/new${clientId ? `?clientId=${clientId}` : ""}`}
          className={cn(buttonVariants(), adminBtnPrimary)}
        >
          New agreement packet
        </Link>
      </div>

      <div className="rounded-lg border border-slate-200 bg-white">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Client</TableHead>
              <TableHead>Signer</TableHead>
              <TableHead>Service</TableHead>
              <TableHead>Versions</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Updated</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {packets.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center text-muted-foreground py-10">
                  No agreement packets yet.
                </TableCell>
              </TableRow>
            ) : (
              packets.map((packet) => (
                <TableRow key={packet.id}>
                  <TableCell>
                    <Link
                      href={adminAgreementPacketUrl(packet.id)}
                      className="font-medium text-slate-900 hover:underline"
                    >
                      {packet.client.companyName}
                    </Link>
                  </TableCell>
                  <TableCell className="text-sm">{packet.signerName}</TableCell>
                  <TableCell className="text-sm">
                    {packet.serviceType.replace(/_/g, " ")}
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground">
                    CSA {packet.clientServicesTemplate.version}
                    <br />
                    WA {packet.workAuthorizationTemplate.version}
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant="outline"
                      className={packetStatusBadgeClass(packet.status)}
                    >
                      {PACKET_STATUS_LABELS[packet.status]}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {format(new Date(packet.updatedAt), "MMM d, yyyy")}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
