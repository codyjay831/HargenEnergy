import type {
  AgreementPacketStatus,
  AgreementServiceType,
  LegalTemplateType,
} from "@/generated/prisma/client";

export const CSA_VERSION = "2026-06-01";
export const WORK_AUTH_VERSION = "2026-06-01";

export type TemplateSection = {
  title: string;
  paragraphs?: string[];
  listItems?: string[];
};

export type TemplateBody = {
  sections: TemplateSection[];
};

export type SupportBlockScope = {
  planName: string;
  hoursPerPeriod: number;
  period: "WEEKLY" | "MONTHLY";
  priceCents: number;
  billingCadence: string;
  startDate: string;
  renewalTerms: string;
  cancellationTerms: string;
  unusedTimePolicy: string;
  includedCategories: string[];
  excludedCategories: string[];
  accessRequired: string;
  approvalRules: string;
  specialNotes?: string;
};

export type RequestBasedScope = {
  requestTitle: string;
  flatFeeCents?: number;
  estimateRange?: string;
  deliverables: string;
  assumptions: string;
  exclusions: string;
  requiredClientInfo: string;
  approvalRules: string;
  targetTurnaround?: string;
  specialNotes?: string;
};

export type CustomScope = {
  description: string;
  specialNotes?: string;
};

export type AgreementPricingJson = {
  summary?: string;
  amountCents?: number;
  currency?: string;
};

export type AgreementBillingJson = {
  cadence?: string;
  startDate?: string;
  renewalTerms?: string;
  cancellationTerms?: string;
  unusedTimePolicy?: string;
};

export type AgreementAcceptanceBlock = {
  title: string;
  checkboxText: string;
};

export type AgreementPacketSnapshot = {
  packetId: string;
  generatedAt: string;
  providerLegalName: string;
  companyLegalName: string;
  companyDba: string | null;
  companyAddress: string | null;
  signerName: string;
  signerTitle: string;
  signerEmail: string;
  serviceType: AgreementServiceType;
  clientServicesAgreement: {
    version: string;
    title: string;
    sections: TemplateSection[];
  };
  workAuthorization: {
    version: string;
    title: string;
    sections: TemplateSection[];
    scopeSummary: TemplateSection[];
  };
  scope: SupportBlockScope | RequestBasedScope | CustomScope | null;
  pricing: AgreementPricingJson | null;
  billing: AgreementBillingJson | null;
  acceptanceBlocks: AgreementAcceptanceBlock[];
};

export type LegalTemplateRecord = {
  id: string;
  type: LegalTemplateType;
  version: string;
  title: string;
  bodyMarkdown: string;
};

export const IMMUTABLE_STATUSES: AgreementPacketStatus[] = [
  "SIGNED",
  "ACTIVE",
  "VOIDED",
  "SUPERSEDED",
];

export const MANUAL_SENT_LABEL = "Sent Manually / Outside App";

export const CSA_ACCEPTANCE_CHECKBOX =
  "I am authorized to bind the company listed above, and I agree on behalf of that company to the Hargen Energy Client Services Agreement version {version}.";

export const WORK_AUTH_ACCEPTANCE_CHECKBOX =
  "I approve the selected support plan, scope, billing terms, start date, included work, exclusions, and client responsibilities shown in this Work Authorization.";
