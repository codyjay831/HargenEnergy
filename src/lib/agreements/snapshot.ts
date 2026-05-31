import type { AgreementServiceType } from "@/generated/prisma/client";
import { parseTemplateBody } from "@/lib/agreements/template-content";
import type {
  AgreementBillingJson,
  AgreementPacketSnapshot,
  AgreementPricingJson,
  CustomScope,
  LegalTemplateRecord,
  RequestBasedScope,
  SupportBlockScope,
  TemplateSection,
} from "@/lib/agreements/types";
import {
  CSA_ACCEPTANCE_CHECKBOX,
  WORK_AUTH_ACCEPTANCE_CHECKBOX,
} from "@/lib/agreements/types";

const PROVIDER_LEGAL_NAME = "Hargen Energy LLC";

export type PacketSnapshotInput = {
  id: string;
  companyLegalName: string;
  companyDba: string | null;
  companyAddress: string | null;
  signerName: string;
  signerTitle: string;
  signerEmail: string;
  serviceType: AgreementServiceType;
  selectedScopeJson: unknown;
  pricingJson: unknown;
  billingJson: unknown;
  clientServicesTemplate: LegalTemplateRecord;
  workAuthorizationTemplate: LegalTemplateRecord;
};

function formatMoney(cents: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(cents / 100);
}

function parseScope(
  serviceType: AgreementServiceType,
  selectedScopeJson: unknown,
): SupportBlockScope | RequestBasedScope | CustomScope | null {
  if (!selectedScopeJson || typeof selectedScopeJson !== "object") {
    return null;
  }
  return selectedScopeJson as SupportBlockScope | RequestBasedScope | CustomScope;
}

function buildSupportBlockScopeSections(scope: SupportBlockScope): TemplateSection[] {
  return [
    {
      title: "5. Support Block Scope",
      paragraphs: [
        `Plan: ${scope.planName}`,
        `Reserved time: ${scope.hoursPerPeriod} hour(s) per ${scope.period.toLowerCase()}`,
        `Price: ${formatMoney(scope.priceCents)} (${scope.billingCadence})`,
        `Start date: ${scope.startDate}`,
      ],
    },
    {
      title: "6. Included Categories",
      listItems: scope.includedCategories.length > 0 ? scope.includedCategories : ["None specified"],
    },
    {
      title: "7. Excluded Work",
      listItems: scope.excludedCategories.length > 0 ? scope.excludedCategories : ["None specified"],
    },
    {
      title: "8. Deliverables",
      paragraphs: [
        "Deliverables consist of operational support within included categories during the reserved support block, such as follow-through, documentation, coordination, CRM updates, and client-approved communications.",
      ],
    },
    {
      title: "9. Required Client Information and Access",
      paragraphs: [scope.accessRequired || "As requested per task."],
    },
    {
      title: "10. Approval Rules",
      paragraphs: [scope.approvalRules || "Client approval required before client-facing or third-party submissions."],
    },
    {
      title: "11. Billing Amount and Cadence",
      paragraphs: [
        `${formatMoney(scope.priceCents)} billed ${scope.billingCadence.toLowerCase()}.`,
      ],
    },
    {
      title: "12. Start Date",
      paragraphs: [scope.startDate],
    },
    {
      title: "13. Renewal and Cancellation Terms",
      paragraphs: [scope.renewalTerms, scope.cancellationTerms],
    },
    {
      title: "14. Unused Time / Rollover / Expiration Policy",
      paragraphs: [scope.unusedTimePolicy],
    },
    ...(scope.specialNotes
      ? [{ title: "18. Special Notes", paragraphs: [scope.specialNotes] }]
      : []),
  ];
}

function buildRequestBasedScopeSections(scope: RequestBasedScope): TemplateSection[] {
  const priceLine =
    scope.flatFeeCents != null
      ? `Flat fee: ${formatMoney(scope.flatFeeCents)}`
      : scope.estimateRange
        ? `Estimate range: ${scope.estimateRange}`
        : "Pricing to be confirmed after review.";

  return [
    {
      title: "5. Request-Based Scope",
      paragraphs: [`Request: ${scope.requestTitle}`, priceLine],
    },
    {
      title: "6. Included Categories",
      paragraphs: ["Included work is limited to the deliverables and assumptions below."],
    },
    {
      title: "7. Excluded Work",
      paragraphs: [scope.exclusions],
    },
    {
      title: "8. Deliverables",
      paragraphs: [scope.deliverables],
    },
    {
      title: "9. Required Client Information and Access",
      paragraphs: [scope.requiredClientInfo],
    },
    {
      title: "10. Approval Rules",
      paragraphs: [scope.approvalRules],
    },
    {
      title: "11. Billing Amount and Cadence",
      paragraphs: [priceLine],
    },
    {
      title: "12. Start Date",
      paragraphs: ["Work begins after this Work Authorization is accepted and any required deposit or payment authorization is received."],
    },
    {
      title: "13. Renewal and Cancellation Terms",
      paragraphs: [
        "This authorization covers the described request unless extended by a new Work Authorization.",
        scope.targetTurnaround
          ? `Target turnaround (estimate only): ${scope.targetTurnaround}`
          : "Turnaround is an estimate only and not guaranteed.",
      ],
    },
    {
      title: "14. Unused Time / Rollover / Expiration Policy",
      paragraphs: ["Not applicable to request-based work unless stated in assumptions."],
    },
    {
      title: "Assumptions",
      paragraphs: [scope.assumptions],
    },
    ...(scope.specialNotes
      ? [{ title: "18. Special Notes", paragraphs: [scope.specialNotes] }]
      : []),
  ];
}

function buildCustomScopeSections(scope: CustomScope): TemplateSection[] {
  return [
    {
      title: "5. Custom Scope",
      paragraphs: [scope.description],
    },
    ...(scope.specialNotes
      ? [{ title: "18. Special Notes", paragraphs: [scope.specialNotes] }]
      : []),
  ];
}

export function buildScopeSummarySections(
  serviceType: AgreementServiceType,
  selectedScopeJson: unknown,
): TemplateSection[] {
  const scope = parseScope(serviceType, selectedScopeJson);
  if (!scope) {
    return [{ title: "5. Scope", paragraphs: ["Scope details not specified."] }];
  }

  if (serviceType === "SUPPORT_BLOCK") {
    return buildSupportBlockScopeSections(scope as SupportBlockScope);
  }
  if (serviceType === "REQUEST_BASED") {
    return buildRequestBasedScopeSections(scope as RequestBasedScope);
  }
  return buildCustomScopeSections(scope as CustomScope);
}

export function buildPacketSnapshot(input: PacketSnapshotInput): AgreementPacketSnapshot {
  const csaBody = parseTemplateBody(input.clientServicesTemplate.bodyMarkdown);
  const workAuthBase = parseTemplateBody(input.workAuthorizationTemplate.bodyMarkdown);
  const scopeSummary = buildScopeSummarySections(
    input.serviceType,
    input.selectedScopeJson,
  );

  const workAuthSections: TemplateSection[] = [
    {
      title: "Work Authorization Header",
      paragraphs: [
        `Work Authorization ID: ${input.id}`,
        `Related Client Services Agreement version: ${input.clientServicesTemplate.version}`,
        `Client: ${input.companyLegalName}${input.companyDba ? ` (DBA: ${input.companyDba})` : ""}`,
        input.companyAddress ? `Address: ${input.companyAddress}` : "",
        `Authorized signer: ${input.signerName}, ${input.signerTitle} (${input.signerEmail})`,
        `Service type: ${input.serviceType.replace(/_/g, " ")}`,
      ].filter(Boolean),
    },
    ...workAuthBase.sections.slice(0, 4),
    ...scopeSummary,
    ...workAuthBase.sections.slice(4),
  ];

  const csaVersion = input.clientServicesTemplate.version;

  return {
    packetId: input.id,
    generatedAt: new Date().toISOString(),
    providerLegalName: PROVIDER_LEGAL_NAME,
    companyLegalName: input.companyLegalName,
    companyDba: input.companyDba,
    companyAddress: input.companyAddress,
    signerName: input.signerName,
    signerTitle: input.signerTitle,
    signerEmail: input.signerEmail,
    serviceType: input.serviceType,
    clientServicesAgreement: {
      version: csaVersion,
      title: input.clientServicesTemplate.title,
      sections: csaBody.sections,
    },
    workAuthorization: {
      version: input.workAuthorizationTemplate.version,
      title: input.workAuthorizationTemplate.title,
      sections: workAuthSections,
      scopeSummary,
    },
    scope: parseScope(input.serviceType, input.selectedScopeJson),
    pricing: (input.pricingJson as AgreementPricingJson | null) ?? null,
    billing: (input.billingJson as AgreementBillingJson | null) ?? null,
    acceptanceBlocks: [
      {
        title: "Client Services Agreement Acceptance",
        checkboxText: CSA_ACCEPTANCE_CHECKBOX.replace("{version}", csaVersion),
      },
      {
        title: "Initial Work Authorization Acceptance",
        checkboxText: WORK_AUTH_ACCEPTANCE_CHECKBOX,
      },
    ],
  };
}

export function parseStoredSnapshot(value: unknown): AgreementPacketSnapshot | null {
  if (!value || typeof value !== "object") {
    return null;
  }
  const snapshot = value as AgreementPacketSnapshot;
  if (!snapshot.packetId || !snapshot.clientServicesAgreement) {
    return null;
  }
  return snapshot;
}
