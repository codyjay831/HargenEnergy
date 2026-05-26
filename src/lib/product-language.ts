/**
 * Product Language Glossary
 *
 * Single source of truth for all user-facing terminology.
 * Ensures consistent language across admin, public, portal, and email surfaces.
 */

// Canonical lifecycle stage labels
export const PRODUCT_LANGUAGE = {
  discoveryRequest: {
    singular: "Discovery call request",
    plural: "Discovery call requests",
    action: "Request a discovery call",
    detailTitle: "Discovery call request",
    statusLabel: "Qualification stage",
  },

  discoveryCall: {
    singular: "Discovery call",
    plural: "Discovery calls",
    scheduleAction: "Schedule your discovery call",
    scheduledLabel: "Discovery call scheduled",
  },

  // Company states
  prospect: {
    singular: "Prospect",
    plural: "Prospects",
    listTitle: "Prospects",
    listSubtitle: "Companies awaiting activation after discovery call and contract.",
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
    supportBlock: "Support Block",
    requestBased: "Request-Based Work",
    pricingPending: "Pricing pending review",
  },

  supportSetup: {
    title: "Your support setup",
    approvedAreasTitle: "Approved support areas",
    requestedAreasTitle: "What you requested",
    scopeDiffNotice:
      "Your account manager may adjust scope after the discovery call. Approved areas can differ from your original request.",
    requestBasedExplainer:
      "Send work as needed. Hargen reviews each request and confirms pricing before work continues.",
    noApprovedAreas: "No support areas configured yet.",
    changeScopePrompt:
      "To add or remove support areas, contact your Hargen account manager.",
    blockedSubmitTitle: "Cannot send work yet",
    viewSetupLink: "View your support setup",
    inviteScopeBlocked:
      "Configure approved support areas in Engagement & approved work before sending a portal invite.",
  },

  portalDiscoveryRequest: {
    title: "Your discovery call request",
    submittedLabel: "Submitted",
    supportAreas: "Support areas you selected",
    bottleneck: "Biggest bottleneck",
    planInterest: "Plan interest",
    urgency: "Urgency",
    requestScopeChange: "Request scope change",
    scopeChangeTitle: "Request a scope change",
    scopeChangeDescription:
      "Tell us what should change. Your account manager will review before updating approved work.",
    scopeChangeNote: "What should change?",
    scopeChangeOptionalAreas: "Updated support areas (optional)",
    scopeChangeSubmit: "Send scope change request",
    scopeChangeSuccess: "Scope change request sent. Your account manager will follow up.",
  },

  // Outreach CRM
  outreachCompany: {
    singular: "Outreach company",
    plural: "Outreach companies",
    listTitle: "Outreach Companies",
    listSubtitle: "Outbound research pipeline. Different from inbound discovery call requests.",
    pipelineLabel: "Companies in pipeline",
  },
} as const;

// Data model to UI label mappings
export const KIND_LABELS = {
  PROSPECT_INTAKE: PRODUCT_LANGUAGE.discoveryRequest.singular,
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
  publicCTA: PRODUCT_LANGUAGE.discoveryRequest.action,
} as const;

// Email subject patterns
export const EMAIL_SUBJECTS = {
  discoveryConfirmation: (companyName: string) =>
    `Discovery call request received - ${companyName}`,
  discoveryAdminAlert: (companyName: string) => `New discovery call request: ${companyName}`,
  workRequestAdminAlert: (companyName: string) => `New work request: ${companyName}`,
  discoverySchedulingLink: (companyName: string) =>
    `Schedule your Hargen discovery call — ${companyName}`,
  discoveryBookingConfirmation: (companyName: string) =>
    `Discovery call scheduled — ${companyName}`,
  discoveryReschedule: (companyName: string) => `Discovery call rescheduled — ${companyName}`,
  discoveryReminder: (companyName: string) => `Reminder: Hargen discovery call — ${companyName}`,
  discoveryCancel: (companyName: string) => `Discovery call canceled — ${companyName}`,
  discoveryRecap: (companyName: string) => `Discovery call recap — ${companyName}`,
  discoveryNeedsInfo: (companyName: string) =>
    `More information needed — ${companyName} discovery call request`,
} as const;

// Form copy
export const FORM_COPY = {
  discoverySuccessScheduling: {
    redirecting: "Taking you to scheduling…",
  },
  discoverySuccessManual: {
    title: "Discovery call request received",
    body: "We received your request. Scheduling is not available online right now — we'll follow up by email, usually within one business day, with next steps. Portal access for ongoing client work comes after discovery call, contract, and payment.",
    successSteps: {
      received: {
        title: "Request received",
        body: "Your discovery call request is in our queue.",
      },
      review: {
        title: "We'll follow up",
        body: "We'll reach out by email to schedule your discovery call and discuss scope.",
      },
      activation: {
        title: "Activation",
        body: "After contract and payment setup, you'll get portal access and we start the work.",
      },
    },
  },
  discoverySuccess: {
    title: "Discovery call request received",
    body: "We received your request. We'll follow up by email, usually within one business day. Portal access for ongoing client work comes after discovery call, contract, and payment.",
  },
  discoveryRequest: {
    stepIndicator: (step: number) => `Step ${step} of 2`,
    step1Title: "Tell us what's going on",
    step2Title: "Help us prepare",
    companyName: "Company name",
    yourName: "Your name",
    email: "Email",
    phone: "Phone",
    phoneHelper: "Optional — digits, spaces, and + - ( ) . allowed",
    bottleneck: "What's your biggest bottleneck?",
    bottleneckPlaceholder: "Tell us where your jobs are getting stuck...",
    supportAreas: "Where do you need help?",
    supportAreasHelper:
      "Select all that apply — we'll discuss scope on the discovery call.",
    role: "Role / title",
    website: "Company website",
    websiteHelper: "e.g. solarpros.com or https://solarpros.com",
    serviceArea: "Service area (states/counties)",
    firstPriority: "What would help most this week?",
    firstPriorityPlaceholder:
      "If we could move one thing forward this week, what would it be?",
    tools: "Current tools (CRM, proposal software, etc.)",
    toolsPlaceholder: "e.g. Aurora, Solo, HubSpot, Sighten...",
    plan: "Preferred support level",
    urgency: "Urgency",
    continue: "Continue",
    back: "Back",
    submit: "Submit discovery call request",
    sending: "Sending...",
    anotherRequestConfirm:
      "Submit another discovery call request for a different company?",
    anotherRequest: "Send another request",
    legal:
      "By submitting this form, you agree to be contacted by Hargen Energy LLC regarding your discovery call request.",
    successSteps: {
      received: {
        title: "Request received",
        body: "Your discovery call request is in our queue.",
      },
      review: {
        title: "Review & alignment",
        body: "We'll reach out within 1 business day to discuss your bottleneck, scope, and support level.",
      },
      activation: {
        title: "Activation",
        body: "After contract and payment setup, you'll get portal access and we start the work.",
      },
    },
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
