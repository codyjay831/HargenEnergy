import Link from "next/link";
import { prisma } from "@/lib/prisma";
import {
  ensureDefaultLegalTemplates,
  getActiveTemplatesByType,
} from "@/lib/agreements/ensure-templates";
import { AgreementPacketEditorForm } from "@/components/admin/agreements/AgreementPacketEditorForm";
import { adminAgreementsUrl } from "@/lib/app-url";

export const dynamic = "force-dynamic";

type NewAgreementPageProps = {
  searchParams: Promise<{ clientId?: string }>;
};

export default async function NewAgreementPacketPage({
  searchParams,
}: NewAgreementPageProps) {
  await ensureDefaultLegalTemplates();
  const { clientId } = await searchParams;

  const [clients, csaTemplates, workAuthTemplates] = await Promise.all([
    prisma.client.findMany({
      select: {
        id: true,
        companyName: true,
        contactName: true,
        email: true,
        role: true,
      },
      orderBy: { companyName: "asc" },
    }),
    getActiveTemplatesByType("CLIENT_SERVICES_AGREEMENT"),
    getActiveTemplatesByType("WORK_AUTHORIZATION"),
  ]);

  if (clients.length === 0) {
    return (
      <div className="space-y-4">
        <h1 className="text-2xl font-bold">New agreement packet</h1>
        <p className="text-sm text-muted-foreground">
          Create a client record before generating an agreement packet.
        </p>
        <Link href={adminAgreementsUrl()} className="text-sm text-emerald-700 hover:underline">
          Back to agreement packets
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <Link
          href={adminAgreementsUrl(clientId)}
          className="text-sm text-slate-500 hover:text-slate-900 hover:underline"
        >
          ← Agreement packets
        </Link>
        <h1 className="text-2xl font-bold text-slate-900 mt-2">New agreement packet</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Save a draft, preview live data, then generate the packet to freeze the legal snapshot.
        </p>
      </div>

      <AgreementPacketEditorForm
        mode="create"
        clients={clients}
        csaTemplates={csaTemplates}
        workAuthTemplates={workAuthTemplates}
        initialClientId={clientId}
      />
    </div>
  );
}
