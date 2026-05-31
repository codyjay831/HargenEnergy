import {
  CSA_VERSION,
  WORK_AUTH_VERSION,
  type TemplateBody,
  type TemplateSection,
} from "@/lib/agreements/types";

const SUPPORT_EMAIL = "support@hargenenergy.com";
const PROVIDER = "Hargen Energy LLC";

function csaSections(): TemplateSection[] {
  return [
    {
      title: "1. Parties",
      paragraphs: [
        `This Client Services Agreement ("Agreement") is entered into between ${PROVIDER} ("Hargen Energy," "Hargen," "we," "our," or "us") and the client company identified in the accompanying Work Authorization ("Client," "you," or "your").`,
        "This Agreement governs business-to-business solar operations support services provided by Hargen Energy to Client.",
      ],
    },
    {
      title: "2. Business-to-Business Services",
      paragraphs: [
        "Hargen Energy provides services to businesses, not to homeowners or general consumers.",
        "Our services are intended for solar contractors, residential solar companies, project managers, office teams, and related business users who need support with solar operations, documentation, follow-up, scheduling, customer communication, and project administration.",
      ],
    },
    {
      title: "3. Relationship to Work Authorizations",
      paragraphs: [
        "This Agreement provides the general legal framework for the relationship between Hargen Energy and Client.",
        "Specific scopes of work, pricing, billing cadence, included categories, exclusions, and start dates are defined in one or more Work Authorizations executed under this Agreement.",
        "If there is a conflict between this Agreement and a Work Authorization for a specific scope of services, the Work Authorization controls for that specific scope.",
      ],
    },
    {
      title: "4. Services Provided",
      paragraphs: [
        "Hargen Energy may provide project follow-through, permit support, utility and interconnection support, PTO follow-up, CRM cleanup, document organization, scheduling support, customer update assistance, quote or proposal support, equipment coordination, and other scoped back-office or operations support services as described in an applicable Work Authorization.",
        "Services are administrative and operational support unless expressly stated otherwise in writing.",
      ],
    },
    {
      title: "5. No Contractor-of-Record / No Engineer-of-Record / No Professional Advice",
      paragraphs: [
        "Unless specifically agreed in a separate written agreement signed by both parties, Hargen Energy does not act as the contractor of record, installer of record, engineer of record, or permit holder for any project.",
        "Hargen Energy is not acting as the homeowner's contractor, salesperson, financial advisor, legal advisor, tax advisor, engineer, utility representative, AHJ representative, or permit authority.",
      ],
    },
    {
      title: "6. Client Responsibilities",
      listItems: [
        "Provide accurate, complete, and authorized information, documents, instructions, and approvals.",
        "Ensure submitted materials are appropriate and that Client has the right to disclose them.",
        "Respond to requests for missing information, corrections, and clarifications in a timely manner.",
        "Review drafts, summaries, submissions, and communications where review is requested or reasonably required.",
        "Not request unlawful, deceptive, unsafe, or unauthorized work.",
        "Remain responsible for customer relationships, contractor obligations, license obligations, utility requirements, AHJ requirements, and business decisions.",
      ],
    },
    {
      title: "7. Submitted Documents and Project Information",
      paragraphs: [
        "Client may submit or provide access to documents and information related to solar projects, customers, permits, utilities, inspections, equipment, CRMs, scheduling, communications, billing, and other business operations.",
        "Client retains ownership of submitted materials. Client grants Hargen Energy a limited right to access, use, process, copy, store, transmit, organize, summarize, and disclose submitted materials as reasonably necessary to provide requested services, operate our business, maintain records, comply with law, protect our systems, and enforce our agreements.",
      ],
    },
    {
      title: "8. Client Authorization to Use Third-Party Portals and Systems",
      paragraphs: [
        "When Client directs Hargen Energy to use a third-party system, submit information to a third party, communicate with a third party, or access a third-party account, Client represents that Client has authority to do so.",
      ],
    },
    {
      title: "9. No Guaranteed Permits, Utility Approvals, PTO, Inspections, Timelines, or Outcomes",
      listItems: [
        "Permit approval, utility approval, interconnection approval, or PTO approval",
        "Inspection pass results, rebate approval, or program eligibility",
        "Specific AHJ or utility processing timelines",
        "Customer payment, customer approval, or customer responsiveness",
        "CRM accuracy, project completion dates, or any business or revenue result",
      ],
      paragraphs: [
        "Any turnaround times, response targets, or completion estimates are estimates only unless a Work Authorization expressly states otherwise.",
      ],
    },
    {
      title: "10. Access Credentials and Client Systems",
      paragraphs: [
        "Client is responsible for providing and maintaining appropriate access credentials, invitations, and permissions for systems Hargen Energy is authorized to use on Client's behalf.",
        "Client must promptly notify Hargen Energy if access should be removed, changed, or if credentials may be compromised.",
      ],
    },
    {
      title: "11. AI-Assisted Processing Disclosure",
      paragraphs: [
        "Hargen Energy may use AI-assisted tools to help with internal operations and client service delivery, including organizing documents, summarizing project notes, drafting messages, identifying missing information, preparing task lists, classifying work requests, or reviewing uploaded materials.",
        "AI-assisted tools support, not replace, business judgment. Hargen Energy may review AI-assisted outputs before using them for client-facing, service-critical, or operationally important work.",
      ],
    },
    {
      title: "12. Confidentiality",
      paragraphs: [
        "Each party may receive confidential or business-sensitive information from the other party and agrees to use reasonable care to protect it and use it only for the purpose of the business relationship, service delivery, legal compliance, security, or as otherwise authorized.",
      ],
    },
    {
      title: "13. Data Handling and Privacy Policy Reference",
      paragraphs: [
        "Hargen Energy's collection and use of personal information is described in our Privacy Policy at hargenenergy.com/privacy.",
        "By using our services under this Agreement, Client acknowledges that information may be collected, used, processed, stored, and shared as described in the Privacy Policy.",
      ],
    },
    {
      title: "14. Payment Terms Reference",
      paragraphs: [
        "Fees, billing schedules, payment methods, renewal terms, support block amounts, request fees, deposits, late fees, cancellation terms, and refund terms are stated in the applicable Work Authorization, order form, invoice, checkout page, payment authorization, or other billing document.",
        "Client agrees to pay all amounts owed under applicable billing terms.",
      ],
    },
    {
      title: "15. Pausing Work for Missing Info, Payment, or Access",
      paragraphs: [
        "Hargen Energy may pause, decline, or rescope work if required information is missing, required access is unavailable, the request is outside agreed scope, payment is late or declined, or Client fails to provide needed approvals or instructions.",
      ],
    },
    {
      title: "16. Independent Contractor Relationship",
      paragraphs: [
        "Hargen Energy is an independent contractor. Nothing in this Agreement creates a partnership, joint venture, agency, or employment relationship between the parties.",
      ],
    },
    {
      title: "17. Intellectual Property and Work Product",
      paragraphs: [
        "Hargen Energy owns its website, portal, workflows, templates, service processes, internal tools, and other intellectual property except for materials owned by Client or third parties.",
        "Client retains ownership of materials Client submits. Unless otherwise agreed in writing, work product created specifically for Client may be used by Client for its internal business purposes after all applicable fees have been paid.",
      ],
    },
    {
      title: "18. Disclaimers",
      paragraphs: [
        'Hargen Energy provides services on an "as available" basis. To the maximum extent permitted by law, Hargen Energy disclaims all warranties, express or implied, including warranties of merchantability, fitness for a particular purpose, and non-infringement.',
      ],
    },
    {
      title: "19. Limitation of Liability",
      paragraphs: [
        "To the maximum extent permitted by law, Hargen Energy will not be liable for indirect, incidental, consequential, special, exemplary, punitive, or lost-profit damages.",
        "To the maximum extent permitted by law, Hargen Energy's total liability for any claim arising out of or related to this Agreement or services will not exceed the amounts paid by Client to Hargen Energy for the specific service giving rise to the claim during the three months before the event giving rise to the claim.",
      ],
    },
    {
      title: "20. Indemnification",
      paragraphs: [
        "Client agrees to defend, indemnify, and hold harmless Hargen Energy and its owners, employees, contractors, representatives, service providers, and affiliates from claims arising out of Client's use of services, submitted information, breach of this Agreement, violation of law or third-party rights, or claims from Client's customers, employees, subcontractors, vendors, utilities, AHJs, or other third parties relating to work requested by Client.",
      ],
    },
    {
      title: "21. Termination",
      paragraphs: [
        "Either party may terminate the relationship as provided in an applicable Work Authorization or upon written notice where no Work Authorization states otherwise.",
        "Termination does not eliminate payment obligations, confidentiality obligations, liability limitations, indemnity obligations, or other terms that by their nature should survive termination.",
      ],
    },
    {
      title: "22. Electronic Records and Signatures",
      paragraphs: [
        "The parties agree that agreements, approvals, authorizations, notices, records, signatures, checkbox confirmations, portal approvals, email approvals, and other communications may be provided electronically and may have the same legal effect as a handwritten signature where permitted by law.",
      ],
    },
    {
      title: "23. Governing Law and Venue",
      paragraphs: [
        "This Agreement is governed by the laws of the State of California, without regard to conflict-of-law rules.",
        "Unless a separate signed agreement states otherwise, any dispute arising out of or related to this Agreement will be brought in the state or federal courts located in California, and each party consents to personal jurisdiction and venue in those courts.",
      ],
    },
    {
      title: "24. Notices and Contact",
      paragraphs: [
        `For legal notices, account questions, or contractual questions, contact ${PROVIDER} at ${SUPPORT_EMAIL} or hargenenergy.com.`,
      ],
    },
    {
      title: "25. Entire Agreement / Conflict with Work Authorization",
      paragraphs: [
        "This Agreement, together with applicable Work Authorizations, invoices, payment authorizations, and the Privacy Policy, forms the agreement between the parties regarding the applicable services.",
        "If there is a conflict between this Agreement and a Work Authorization, the Work Authorization controls for the specific scope, pricing, and service terms it describes.",
      ],
    },
  ];
}

function workAuthorizationBaseSections(): TemplateSection[] {
  return [
    {
      title: "1. Work Authorization ID",
      paragraphs: ["Work Authorization ID and packet reference are shown in the packet header."],
    },
    {
      title: "2. Related Client Services Agreement Version",
      paragraphs: [`This Work Authorization is issued under Client Services Agreement version ${CSA_VERSION}.`],
    },
    {
      title: "3. Client, Company, and Signer Details",
      paragraphs: ["Client company, signer, and contact details are shown in the packet header and acceptance page."],
    },
    {
      title: "4. Selected Service Type",
      paragraphs: ["The selected service type and scope summary are shown in the Work Authorization scope section below."],
    },
    {
      title: "15. Overages and Out-of-Scope Work",
      paragraphs: [
        "Work outside the included scope, categories, or time reserved in this Work Authorization requires Client approval before Hargen Energy proceeds, unless emergency action is required to prevent material harm and Client cannot be reached after reasonable effort.",
      ],
    },
    {
      title: "16. Third-Party Dependency Disclaimer",
      paragraphs: [
        "Many tasks depend on utilities, AHJs, permit portals, CRM systems, equipment vendors, and other third parties. Hargen Energy is not responsible for third-party delays, outages, policy changes, or rejections caused by incomplete or inaccurate client-provided information.",
      ],
    },
    {
      title: "17. No Guarantee of AHJ, Utility, Permit, PTO, Inspection, or Customer Outcome",
      paragraphs: [
        "Hargen Energy provides support and follow-through only. Hargen Energy does not guarantee permit approval, utility approval, PTO, inspection results, rebate eligibility, customer payment, or any specific business outcome.",
      ],
    },
    {
      title: "18. Special Notes",
      paragraphs: ["Any special notes appear in the scope summary section of this Work Authorization."],
    },
    {
      title: "19. Client Acceptance",
      paragraphs: [
        "By signing the acceptance page of the Agreement Packet, Client approves this Work Authorization under the Client Services Agreement identified above.",
      ],
    },
  ];
}

export function getDefaultClientServicesAgreementBody(): TemplateBody {
  return {
    sections: csaSections(),
  };
}

export function getDefaultWorkAuthorizationBody(): TemplateBody {
  return {
    sections: workAuthorizationBaseSections(),
  };
}

export function parseTemplateBody(bodyMarkdown: string): TemplateBody {
  try {
    const parsed = JSON.parse(bodyMarkdown) as TemplateBody;
    if (parsed?.sections && Array.isArray(parsed.sections)) {
      return parsed;
    }
  } catch {
    // fall through
  }
  return { sections: [{ title: "Content", paragraphs: [bodyMarkdown] }] };
}

export function serializeTemplateBody(body: TemplateBody): string {
  return JSON.stringify(body);
}

export const DEFAULT_TEMPLATES = [
  {
    type: "CLIENT_SERVICES_AGREEMENT" as const,
    version: CSA_VERSION,
    title: "Hargen Energy Client Services Agreement",
    body: getDefaultClientServicesAgreementBody(),
    effectiveAt: new Date("2026-06-01T00:00:00.000Z"),
  },
  {
    type: "WORK_AUTHORIZATION" as const,
    version: WORK_AUTH_VERSION,
    title: "Hargen Energy Initial Work Authorization",
    body: getDefaultWorkAuthorizationBody(),
    effectiveAt: new Date("2026-06-01T00:00:00.000Z"),
  },
];
