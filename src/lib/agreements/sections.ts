import type { AgreementPacketSnapshot, TemplateSection } from "@/lib/agreements/types";

export type SignedAcceptanceRecord = {
  acceptanceType: string;
  title: string;
  checkboxText: string;
  signerName: string;
  signerTitle: string;
  signerEmail: string;
  signedAt: Date;
};

export type RenderSectionBlock = {
  kind: "heading" | "paragraph" | "list";
  level?: 1 | 2 | 3;
  text?: string;
  items?: string[];
};

function sectionsToBlocks(sections: TemplateSection[]): RenderSectionBlock[] {
  const blocks: RenderSectionBlock[] = [];
  for (const section of sections) {
    blocks.push({ kind: "heading", level: 2, text: section.title });
    for (const paragraph of section.paragraphs ?? []) {
      blocks.push({ kind: "paragraph", text: paragraph });
    }
    if (section.listItems && section.listItems.length > 0) {
      blocks.push({ kind: "list", items: section.listItems });
    }
  }
  return blocks;
}

export function snapshotToDocumentBlocks(
  snapshot: AgreementPacketSnapshot,
  options?: { includeAcceptancePage?: boolean },
): RenderSectionBlock[] {
  const blocks: RenderSectionBlock[] = [
    { kind: "heading", level: 1, text: snapshot.providerLegalName },
    { kind: "paragraph", text: `Agreement Packet ID: ${snapshot.packetId}` },
    { kind: "paragraph", text: `Generated: ${new Date(snapshot.generatedAt).toLocaleString()}` },
    { kind: "paragraph", text: `Client: ${snapshot.companyLegalName}` },
  ];

  if (snapshot.companyDba) {
    blocks.push({ kind: "paragraph", text: `DBA: ${snapshot.companyDba}` });
  }
  if (snapshot.companyAddress) {
    blocks.push({ kind: "paragraph", text: `Address: ${snapshot.companyAddress}` });
  }

  blocks.push(
    { kind: "heading", level: 1, text: snapshot.clientServicesAgreement.title },
    {
      kind: "paragraph",
      text: `Version ${snapshot.clientServicesAgreement.version}`,
    },
    ...sectionsToBlocks(snapshot.clientServicesAgreement.sections),
    { kind: "heading", level: 1, text: snapshot.workAuthorization.title },
    {
      kind: "paragraph",
      text: `Version ${snapshot.workAuthorization.version}`,
    },
    ...sectionsToBlocks(snapshot.workAuthorization.sections),
  );

  if (options?.includeAcceptancePage !== false) {
    blocks.push({ kind: "heading", level: 1, text: "Signature / Acceptance Page" });
    blocks.push({
      kind: "paragraph",
      text: `Signer: ${snapshot.signerName}, ${snapshot.signerTitle} (${snapshot.signerEmail})`,
    });
    blocks.push({
      kind: "paragraph",
      text: `Company: ${snapshot.companyLegalName}`,
    });

    for (const block of snapshot.acceptanceBlocks) {
      blocks.push({ kind: "heading", level: 2, text: block.title });
      blocks.push({ kind: "paragraph", text: block.checkboxText });
      blocks.push({
        kind: "paragraph",
        text: "☐ I agree (unsigned — acceptance pending)",
      });
    }

    blocks.push(
      { kind: "paragraph", text: "Signature: _________________________________" },
      { kind: "paragraph", text: "Title: _________________________________" },
      { kind: "paragraph", text: "Date: _________________________________" },
    );
  }

  return blocks;
}

export function snapshotToSignedDocumentBlocks(
  snapshot: AgreementPacketSnapshot,
  acceptances: SignedAcceptanceRecord[],
): RenderSectionBlock[] {
  const acceptanceByTitle = new Map(
    acceptances.map((a) => [a.title, a]),
  );

  const unsignedBlocks = snapshotToDocumentBlocks(snapshot, {
    includeAcceptancePage: false,
  });

  const blocks: RenderSectionBlock[] = [...unsignedBlocks];

  blocks.push({ kind: "heading", level: 1, text: "Signature / Acceptance Page" });
  blocks.push({
    kind: "paragraph",
    text: `Signer: ${snapshot.signerName}, ${snapshot.signerTitle} (${snapshot.signerEmail})`,
  });
  blocks.push({
    kind: "paragraph",
    text: `Company: ${snapshot.companyLegalName}`,
  });

  for (const block of snapshot.acceptanceBlocks) {
    const record = acceptanceByTitle.get(block.title);
    blocks.push({ kind: "heading", level: 2, text: block.title });
    blocks.push({ kind: "paragraph", text: block.checkboxText });
    blocks.push({
      kind: "paragraph",
      text: record ? "☑ I agree (electronically signed)" : "☐ I agree (unsigned)",
    });
    if (record) {
      blocks.push({
        kind: "paragraph",
        text: `Signed by: ${record.signerName}, ${record.signerTitle} (${record.signerEmail})`,
      });
      blocks.push({
        kind: "paragraph",
        text: `Signed at: ${record.signedAt.toLocaleString()}`,
      });
    }
  }

  const signedAt = acceptances[0]?.signedAt ?? new Date();
  blocks.push(
    {
      kind: "paragraph",
      text: `Electronic signature: ${snapshot.signerName}`,
    },
    { kind: "paragraph", text: `Title: ${snapshot.signerTitle}` },
    { kind: "paragraph", text: `Date: ${signedAt.toLocaleString()}` },
  );

  return blocks;
}

export function snapshotToPlainText(snapshot: AgreementPacketSnapshot): string {
  return snapshotToDocumentBlocks(snapshot)
    .map((block) => {
      if (block.kind === "heading") {
        return `\n${block.text}\n${"=".repeat(block.text?.length ?? 0)}`;
      }
      if (block.kind === "list") {
        return (block.items ?? []).map((item) => `• ${item}`).join("\n");
      }
      return block.text ?? "";
    })
    .join("\n\n");
}
