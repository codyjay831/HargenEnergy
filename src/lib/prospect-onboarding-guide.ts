import type { DiscoveryPipelineStage } from "@/lib/discovery-scheduling/pipeline";
import { getDiscoveryPipelineStageLabel } from "@/lib/discovery-scheduling/pipeline";

export const PROSPECT_ONBOARDING_OVERVIEW =
  "A company submits a discovery call request on /request-help. You review intake, schedule and run a discovery call, send a recap, then decide whether to approve them as a client. Approving sends portal access — but portal access does not mean work can start. Active clients still need scope, agreement, and billing gates before work is enabled.";

export type ProspectOnboardingPhase = {
  id: string;
  label: string;
  summary: string;
  adminWork: string;
  stages: DiscoveryPipelineStage[];
};

export const PROSPECT_ONBOARDING_PHASES: ProspectOnboardingPhase[] = [
  {
    id: "request",
    label: "Request",
    summary: "Intake review, qualify, and send a scheduling link.",
    adminWork: "Review intake, request more info if needed, qualify, send scheduling link.",
    stages: ["new_request", "awaiting_info", "qualified", "link_sent", "booking_canceled"],
  },
  {
    id: "discovery",
    label: "Discovery",
    summary: "Discovery call is booked and run.",
    adminWork: "Join the meeting, mark complete or no-show, capture notes and fit decision.",
    stages: ["scheduled", "completed"],
  },
  {
    id: "recap",
    label: "Recap",
    summary: "Post-call summary emailed to the prospect.",
    adminWork: "Draft and send the recap email.",
    stages: ["recap"],
  },
  {
    id: "decision",
    label: "Decision",
    summary: "Fit decision and client activation.",
    adminWork: "Configure scope and billing, then approve as client.",
    stages: ["proposal_setup", "active_client", "not_a_fit"],
  },
];

export type ProspectOnboardingStageRow = {
  stage: DiscoveryPipelineStage;
  label: string;
  description: string;
  phaseId: string;
};

export const PROSPECT_ONBOARDING_STAGES: ProspectOnboardingStageRow[] = [
  {
    stage: "new_request",
    label: getDiscoveryPipelineStageLabel("new_request"),
    description: "New intake submitted. No scheduling link sent yet.",
    phaseId: "request",
  },
  {
    stage: "awaiting_info",
    label: getDiscoveryPipelineStageLabel("awaiting_info"),
    description: "You asked for more information. Prospect replies by email.",
    phaseId: "request",
  },
  {
    stage: "qualified",
    label: getDiscoveryPipelineStageLabel("qualified"),
    description: "Prospect qualified. Ready to send a scheduling link.",
    phaseId: "request",
  },
  {
    stage: "link_sent",
    label: getDiscoveryPipelineStageLabel("link_sent"),
    description: "Scheduling link sent. Prospect can self-book a time.",
    phaseId: "request",
  },
  {
    stage: "booking_canceled",
    label: getDiscoveryPipelineStageLabel("booking_canceled"),
    description: "Prospect canceled their booking. Regenerate link or follow up.",
    phaseId: "request",
  },
  {
    stage: "scheduled",
    label: getDiscoveryPipelineStageLabel("scheduled"),
    description: "Discovery call is on the calendar.",
    phaseId: "discovery",
  },
  {
    stage: "completed",
    label: getDiscoveryPipelineStageLabel("completed"),
    description: "Call finished. Add notes and fit decision, then draft recap.",
    phaseId: "discovery",
  },
  {
    stage: "recap",
    label: getDiscoveryPipelineStageLabel("recap"),
    description: "Recap drafted. Send it to move to decision.",
    phaseId: "recap",
  },
  {
    stage: "proposal_setup",
    label: getDiscoveryPipelineStageLabel("proposal_setup"),
    description: "Recap sent. Configure scope and billing, then approve as client.",
    phaseId: "decision",
  },
  {
    stage: "not_a_fit",
    label: getDiscoveryPipelineStageLabel("not_a_fit"),
    description: "Prospect closed. No activation.",
    phaseId: "decision",
  },
  {
    stage: "active_client",
    label: getDiscoveryPipelineStageLabel("active_client"),
    description: "Approved as client. Continue setup on the active client view.",
    phaseId: "decision",
  },
];

export type ProspectOnboardingAction = {
  id: string;
  label: string;
  description: string;
  stages?: DiscoveryPipelineStage[];
};

export const PROSPECT_ONBOARDING_ACTIONS: ProspectOnboardingAction[] = [
  {
    id: "review_request",
    label: "Review request",
    description: "Opens the Discovery tab scheduling panel to review intake details.",
    stages: ["new_request"],
  },
  {
    id: "review_meeting",
    label: "Review meeting",
    description: "Opens the Discovery tab scheduling panel with meeting logistics and join link.",
    stages: ["scheduled"],
  },
  {
    id: "request_more_info",
    label: "Request more info",
    description: "Sets request status to NEEDS_INFO and emails the prospect. Optional during Request phase.",
    stages: ["new_request", "awaiting_info"],
  },
  {
    id: "qualify_prospect",
    label: "Qualify prospect",
    description: "Marks the request reviewed. Required before you can send a scheduling link.",
    stages: ["awaiting_info"],
  },
  {
    id: "send_scheduling_link",
    label: "Send scheduling link",
    description: "Creates a secure scheduling link and emails it to the prospect. Blocked if scheduling is not ready.",
    stages: ["qualified"],
  },
  {
    id: "copy_scheduling_link",
    label: "Copy scheduling link",
    description: "Copies the active scheduling URL to clipboard.",
    stages: ["link_sent"],
  },
  {
    id: "resend_link",
    label: "Resend link",
    description: "Re-sends the scheduling email to the prospect.",
    stages: ["link_sent"],
  },
  {
    id: "regenerate_link",
    label: "Regenerate link",
    description: "Invalidates the old link and creates a new one.",
    stages: ["link_sent", "booking_canceled"],
  },
  {
    id: "revoke_link",
    label: "Revoke link",
    description: "Deactivates the scheduling link so the prospect can no longer book.",
    stages: ["link_sent"],
  },
  {
    id: "mark_not_a_fit",
    label: "Mark not a fit",
    description: "Closes the prospect without activation. Available during Request and qualification.",
    stages: ["new_request", "awaiting_info", "qualified"],
  },
  {
    id: "add_discovery_notes",
    label: "Add discovery notes",
    description: "Opens notes panel to capture call notes and record fit decision (good fit, needs follow-up, not a fit).",
    stages: ["completed"],
  },
  {
    id: "draft_recap",
    label: "Draft recap",
    description: "Opens the recap panel to write the post-call summary email.",
    stages: ["completed"],
  },
  {
    id: "open_recap",
    label: "Open recap",
    description: "Opens the recap panel to review and send the recap email.",
    stages: ["recap"],
  },
  {
    id: "send_recap",
    label: "Send recap",
    description: "Emails the recap to the prospect and moves the pipeline to Decision phase.",
    stages: ["recap"],
  },
  {
    id: "approve_as_client",
    label: "Approve as Client",
    description: "Changes status from LEAD to ACTIVE. Warns if no fit decision recorded. Unlocks portal access path.",
    stages: ["proposal_setup"],
  },
  {
    id: "pre_activation_setup",
    label: "Pre-activation setup",
    description: "Opens Setup tab: service model, approved work areas, system access, and branding.",
    stages: ["proposal_setup"],
  },
  {
    id: "access_billing",
    label: "Access & billing",
    description: "Opens Billing tab: portal invite and Stripe/billing configuration.",
    stages: ["proposal_setup"],
  },
];

export const PROSPECT_SCHEDULING_REQUIREMENTS = [
  "Discovery scheduling enabled",
  "Google Calendar connected with a calendar selected",
  "Discovery availability windows configured",
  "Default meeting URL set (required when Google Meet fallback is needed)",
];

export const PROSPECT_RECOMMENDED_BEFORE_ACTIVATION = [
  "Discovery call marked complete",
  "Fit decision recorded (Approve warns if missing)",
  "Recap sent to prospect",
];

export const PROSPECT_OPTIONAL_ITEMS = [
  "Request more info — skip if intake is sufficient",
  "Pre-activation setup before approval — tabs appear at Ready to activate stage",
  "Mark not a fit at any point during Request or qualification",
];

export const PROSPECT_NOT_AVAILABLE = [
  "Billable work or timers",
  "Client portal work submission",
  "Full client setup checklist (available on active client view)",
];

export type ProspectOnboardingTab = {
  id: string;
  label: string;
  description: string;
  whenVisible: string;
};

export const PROSPECT_ONBOARDING_TABS: ProspectOnboardingTab[] = [
  {
    id: "discovery",
    label: "Discovery",
    description: "Intake snapshot, scheduling panel, discovery notes, and recap workspace.",
    whenVisible: "Always visible",
  },
  {
    id: "setup",
    label: "Pre-activation setup",
    description: "Engagement type, approved work areas, system access, and branding.",
    whenVisible: "Only at Ready to activate stage (proposal_setup)",
  },
  {
    id: "billing",
    label: "Access & billing",
    description: "Portal invite and billing/subscription configuration.",
    whenVisible: "Only at Ready to activate stage (proposal_setup)",
  },
];
