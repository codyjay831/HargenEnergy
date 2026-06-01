import type { Metadata } from "next";
import { AgreementSigningClient } from "@/components/agreements/AgreementSigningClient";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { resolveSigningLinkByRawToken } from "@/lib/agreements/signing-links";
import { AgreementSigningLinkStatus } from "@/generated/prisma/client";
import { agreementSigningPdfDownloadUrl } from "@/lib/app-url";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Sign agreement",
  robots: { index: false, follow: false },
};

type AgreementSignPageProps = {
  params: Promise<{ token: string }>;
};

export default async function AgreementSignPage({ params }: AgreementSignPageProps) {
  const resolvedParams = await params;
  const token =
    typeof resolvedParams?.token === "string" ? resolvedParams.token : "";

  if (!token) {
    return <SigningShell title="Invalid link" description="This signing link is missing or malformed." />;
  }

  const resolved = await resolveSigningLinkByRawToken(token);
  if (!resolved.ok) {
    return <SigningShell title="Link unavailable" description={resolved.error} />;
  }

  const { link, packet, snapshot } = resolved.data;
  const alreadySigned =
    link.status === AgreementSigningLinkStatus.USED ||
    packet.status === "SIGNED" ||
    packet.status === "ACTIVE";

  if (alreadySigned && packet.signedPdfFileId) {
    return (
      <SigningShell
        title="Agreement signed"
        description="Thank you. Your signed agreement is available for download."
      >
        <a
          href={agreementSigningPdfDownloadUrl(token)}
          className="inline-flex items-center justify-center rounded-md bg-emerald-700 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-800"
        >
          Download signed PDF
        </a>
      </SigningShell>
    );
  }

  if (alreadySigned) {
    return (
      <SigningShell
        title="Agreement signed"
        description="This agreement has already been signed. Contact Hargen Energy if you need a copy."
      />
    );
  }

  if (link.status !== AgreementSigningLinkStatus.ACTIVE) {
    return (
      <SigningShell
        title="Link unavailable"
        description="This signing link is no longer active."
      />
    );
  }

  return (
    <SigningShell
      title="Review and sign"
      description={`Agreement for ${snapshot.companyLegalName}`}
    >
      <AgreementSigningClient rawToken={token} snapshot={snapshot} />
    </SigningShell>
  );
}

function SigningShell({
  title,
  description,
  children,
}: {
  title: string;
  description: string;
  children?: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-slate-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="mx-auto w-full max-w-3xl space-y-6">
        <div className="text-center">
          <p className="text-sm font-semibold uppercase tracking-wider text-emerald-800">
            Hargen Energy
          </p>
          <h1 className="mt-2 text-2xl font-bold tracking-tight text-slate-900">{title}</h1>
          <p className="mt-2 text-sm text-muted-foreground">{description}</p>
        </div>
        {children ? (
          children
        ) : (
          <Card>
            <CardHeader>
              <CardTitle>{title}</CardTitle>
              <CardDescription>{description}</CardDescription>
            </CardHeader>
            <CardContent />
          </Card>
        )}
      </div>
    </div>
  );
}
