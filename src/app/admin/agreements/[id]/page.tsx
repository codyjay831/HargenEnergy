import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { ensureDefaultLegalTemplates } from "@/lib/agreements/ensure-templates";
import {
  buildPacketSnapshot,
  parseStoredSnapshot,
} from "@/lib/agreements/snapshot";
import { AgreementPacketPreview } from "@/components/admin/agreements/AgreementPacketPreview";
import { AgreementPacketDetailActions } from "@/components/admin/agreements/AgreementPacketDetailActions";
import { AgreementPacketEventTimeline } from "@/components/admin/agreements/AgreementPacketEventTimeline";
import { AgreementPacketSigningPanel } from "@/components/admin/agreements/AgreementPacketSigningPanel";
import { AgreementPacketEditorForm } from "@/components/admin/agreements/AgreementPacketEditorForm";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  canEditPacketDraft,
  PACKET_STATUS_LABELS,
  packetStatusBadgeClass,
} from "@/lib/agreements/status";
import { adminAgreementsUrl } from "@/lib/app-url";
import { adminClientTabHref } from "@/lib/admin-client-tabs";
import type {
  CustomScope,
  RequestBasedScope,
  SupportBlockScope,
} from "@/lib/agreements/types";
import { AgreementServiceType } from "@/generated/prisma/client";
import { format } from "date-fns";

export const dynamic = "force-dynamic";

type AgreementDetailPageProps = {
  params: Promise<{ id: string }>;
};

function parseScopeFromJson(
  serviceType: AgreementServiceType,
  value: unknown,
): SupportBlockScope | RequestBasedScope | CustomScope {
  if (!value || typeof value !== "object") {
    if (serviceType === AgreementServiceType.REQUEST_BASED) {
      return {
        requestTitle: "",
        deliverables: "",
        assumptions: "",
        exclusions: "",
        requiredClientInfo: "",
        approvalRules: "",
      };
    }
    if (serviceType === AgreementServiceType.CUSTOM) {
      return { description: "" };
    }
    return {
      planName: "Core Support",
      hoursPerPeriod: 5,
      period: "WEEKLY",
      priceCents: 0,
      billingCadence: "",
      startDate: new Date().toISOString().slice(0, 10),
      renewalTerms: "",
      cancellationTerms: "",
      unusedTimePolicy: "",
      includedCategories: [],
      excludedCategories: [],
      accessRequired: "",
      approvalRules: "",
    };
  }
  return value as SupportBlockScope | RequestBasedScope | CustomScope;
}

export default async function AgreementPacketDetailPage({
  params,
}: AgreementDetailPageProps) {
  await ensureDefaultLegalTemplates();
  const { id } = await params;

  const packet = await prisma.agreementPacket.findUnique({
    where: { id },
    include: {
      client: {
        select: {
          id: true,
          companyName: true,
          contactName: true,
          email: true,
          role: true,
        },
      },
      clientServicesTemplate: true,
      workAuthorizationTemplate: true,
      events: { orderBy: { createdAt: "desc" }, take: 50 },
      unsignedPdfFile: true,
      signedPdfFile: true,
      signingLinks: { orderBy: { createdAt: "desc" }, take: 20 },
      acceptances: { orderBy: { signedAt: "desc" } },
    },
  });

  if (!packet) {
    notFound();
  }

  const [csaTemplates, workAuthTemplates] = await Promise.all([
    prisma.legalTemplate.findMany({
      where: { type: "CLIENT_SERVICES_AGREEMENT", isActive: true },
      orderBy: { effectiveAt: "desc" },
    }),
    prisma.legalTemplate.findMany({
      where: { type: "WORK_AUTHORIZATION", isActive: true },
      orderBy: { effectiveAt: "desc" },
    }),
  ]);

  const frozenSnapshot = parseStoredSnapshot(packet.acceptanceSnapshotJson);
  const liveSnapshot = buildPacketSnapshot({
    id: packet.id,
    companyLegalName: packet.companyLegalName,
    companyDba: packet.companyDba,
    companyAddress: packet.companyAddress,
    signerName: packet.signerName,
    signerTitle: packet.signerTitle,
    signerEmail: packet.signerEmail,
    serviceType: packet.serviceType,
    selectedScopeJson: packet.selectedScopeJson,
    pricingJson: packet.pricingJson,
    billingJson: packet.billingJson,
    clientServicesTemplate: packet.clientServicesTemplate,
    workAuthorizationTemplate: packet.workAuthorizationTemplate,
  });

  const editable = canEditPacketDraft(packet.status);

  return (
    <div className="space-y-6">
      <div>
        <Link
          href={adminAgreementsUrl(packet.clientId)}
          className="text-sm text-slate-500 hover:text-slate-900 hover:underline"
        >
          ← Agreement packets
        </Link>
        <div className="mt-2 flex flex-wrap items-center gap-3">
          <h1 className="text-2xl font-bold text-slate-900">Agreement packet</h1>
          <Badge variant="outline" className={packetStatusBadgeClass(packet.status)}>
            {PACKET_STATUS_LABELS[packet.status]}
          </Badge>
        </div>
        <p className="text-sm text-muted-foreground mt-1">
          Packet ID: <span className="font-mono text-xs">{packet.id}</span>
          {" · "}
          <Link
            href={adminClientTabHref(packet.clientId, "overview")}
            className="text-emerald-700 hover:underline"
          >
            {packet.client.companyName}
          </Link>
        </p>
        {packet.snapshotAt && (
          <p className="text-xs text-muted-foreground mt-1">
            Snapshot frozen {format(new Date(packet.snapshotAt), "MMM d, yyyy h:mm a")}
          </p>
        )}
      </div>

      <Card className="border-slate-200">
        <CardHeader>
          <CardTitle className="text-base">Actions</CardTitle>
        </CardHeader>
        <CardContent>
          <AgreementPacketDetailActions
            packetId={packet.id}
            status={packet.status}
            hasSnapshot={Boolean(frozenSnapshot)}
            hasUnsignedPdf={Boolean(packet.unsignedPdfFileId)}
            hasSignedPdf={Boolean(packet.signedPdfFileId)}
          />
        </CardContent>
      </Card>

      {(packet.status === "READY" ||
        packet.status === "SENT" ||
        packet.status === "VIEWED" ||
        packet.status === "SIGNED" ||
        packet.status === "ACTIVE") && (
        <Card className="border-slate-200">
          <CardHeader>
            <CardTitle className="text-base">Signing</CardTitle>
          </CardHeader>
          <CardContent>
            <AgreementPacketSigningPanel
              packetId={packet.id}
              status={packet.status}
              hasSignedPdf={Boolean(packet.signedPdfFileId)}
              signingLinks={packet.signingLinks}
              acceptances={packet.acceptances}
            />
          </CardContent>
        </Card>
      )}

      {editable && (
        <Card className="border-slate-200">
          <CardHeader>
            <CardTitle className="text-base">Edit draft</CardTitle>
          </CardHeader>
          <CardContent>
            <AgreementPacketEditorForm
              mode="edit"
              packetId={packet.id}
              clients={[packet.client]}
              csaTemplates={csaTemplates}
              workAuthTemplates={workAuthTemplates}
              initialValues={{
                clientId: packet.clientId,
                clientServicesTemplateId: packet.clientServicesTemplateId,
                workAuthorizationTemplateId: packet.workAuthorizationTemplateId,
                companyLegalName: packet.companyLegalName,
                companyDba: packet.companyDba ?? "",
                companyAddress: packet.companyAddress ?? "",
                signerName: packet.signerName,
                signerTitle: packet.signerTitle,
                signerEmail: packet.signerEmail,
                serviceType: packet.serviceType,
                scope: parseScopeFromJson(packet.serviceType, packet.selectedScopeJson),
              }}
            />
          </CardContent>
        </Card>
      )}

      {!editable && packet.status !== "DRAFT" && (
        <div className="rounded-md border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-700">
          This packet is locked. Return to draft (if allowed) or supersede to make changes.
        </div>
      )}

      <Card className="border-slate-200">
        <CardHeader>
          <CardTitle className="text-base">Preview</CardTitle>
        </CardHeader>
        <CardContent>
          {frozenSnapshot ? (
            <AgreementPacketPreview snapshot={frozenSnapshot} source="frozen" />
          ) : packet.status === "DRAFT" ? (
            <AgreementPacketPreview snapshot={liveSnapshot} source="live" />
          ) : (
            <p className="text-sm text-red-600">
              Frozen legal snapshot is missing for this packet. Return to draft and generate
              again, or contact support.
            </p>
          )}
        </CardContent>
      </Card>

      <Card className="border-slate-200">
        <CardHeader>
          <CardTitle className="text-base">Audit timeline</CardTitle>
        </CardHeader>
        <CardContent>
          <AgreementPacketEventTimeline events={packet.events} />
        </CardContent>
      </Card>
    </div>
  );
}
