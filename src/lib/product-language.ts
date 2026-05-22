/**
 * Product Language Glossary
 * 
 * Single source of truth for all user-facing terminology.
 * Ensures consistent language across admin, public, portal, and email surfaces.
 */

// Canonical lifecycle stage labels
export const PRODUCT_LANGUAGE = {
  // Pre-sale / qualification
  walkthrough: {
    singular: "Walkthrough request",
    plural: "Walkthrough requests",
    action: "Request a walkthrough",
    detailTitle: "Walkthrough Request",
    statusLabel: "Qualification stage",
  },
  
  // Company states
  prospect: {
    singular: "Prospect",
    plural: "Prospects",
    listTitle: "Prospects",
    listSubtitle: "Companies awaiting activation after walkthrough and contract.",
    badge: "Prospect",
  },
  
  client: {
    singular: "Client",
    plural: "Clients",
    badge: "Active client",
  },
  
  // Post-activation work
  workRequest: {
    singular: "Work request",
    plural: "Work requests",
    action: "Send work",
    listTitle: "Work",
    listSubtitle: "Jobs and tasks you have sent to Hargen.",
    detailTitle: "Work details",
    statusLabel: "Status",
    newTitle: "Send work",
    newSubtitle: "Tell us what needs to move forward.",
  },

  engagement: {
    blockSupport: "Hourly support block",
    oneOff: "One-off work",
    pricingPending: "Pricing pending review",
  },
  
  // Outreach CRM
  outreachCompany: {
    singular: "Outreach company",
    plural: "Outreach companies",
    listTitle: "Outreach Companies",
    listSubtitle: "Outbound research pipeline. Different from inbound walkthrough requests.",
    pipelineLabel: "Companies in pipeline",
  },
} as const;

// Data model to UI label mappings
export const KIND_LABELS = {
  PROSPECT_INTAKE: PRODUCT_LANGUAGE.walkthrough.singular,
  CLIENT_OPS: PRODUCT_LANGUAGE.workRequest.singular,
} as const;

export const STATUS_LABELS = {
  LEAD: PRODUCT_LANGUAGE.prospect.badge,
  ACTIVE: PRODUCT_LANGUAGE.client.badge,
  PAUSED: "Paused",
  CANCELLED: "Cancelled",
} as const;

// Navigation labels
export const NAV_LABELS = {
  adminWorkRequests: PRODUCT_LANGUAGE.workRequest.plural,
  adminClients: "Clients",
  adminOutreach: "Outreach",
  portalSubmit: PRODUCT_LANGUAGE.workRequest.action,
  portalWork: "My work",
  portalRequests: "My Requests",
  publicCTA: PRODUCT_LANGUAGE.walkthrough.action,
} as const;

// Email subject patterns
export const EMAIL_SUBJECTS = {
  walkthroughConfirmation: (companyName: string) => `Walkthrough request received - ${companyName}`,
  walkthroughAdminAlert: (companyName: string) => `New walkthrough request: ${companyName}`,
  workRequestAdminAlert: (companyName: string) => `New work request: ${companyName}`,
} as const;

// Form copy
export const FORM_COPY = {
  walkthroughSuccess: {
    title: "Walkthrough request received",
    body: "We will review where you are stuck and follow up by email, usually within one business day. Portal access for ongoing client work comes after walkthrough, contract, and payment.",
  },
  workRequestSuccess: {
    title: "Request submitted",
    body: "Your work request has been logged. We'll update you on progress.",
  },
} as const;

// Helper functions
export function getRequestKindLabel(kind: "PROSPECT_INTAKE" | "CLIENT_OPS"): string {
  return KIND_LABELS[kind];
}

export function getClientStatusLabel(status: "LEAD" | "ACTIVE" | "PAUSED" | "CANCELLED"): string {
  return STATUS_LABELS[status];
}
