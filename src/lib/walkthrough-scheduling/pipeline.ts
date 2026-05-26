import {
  ClientStatus,
  RequestStatus,
  WalkthroughAppointmentStatus,
  WalkthroughFitDecision,
  WalkthroughSchedulingLinkStatus,
} from "@/generated/prisma/client";

export type WalkthroughPipelineStage =
  | "new_request"
  | "awaiting_info"
  | "qualified"
  | "link_sent"
  | "booking_canceled"
  | "scheduled"
  | "completed"
  | "recap"
  | "proposal_setup"
  | "active_client"
  | "not_a_fit";

type AppointmentForPipeline = {
  status: WalkthroughAppointmentStatus;
  fitDecision?: WalkthroughFitDecision | null;
  recapSentAt?: Date | null;
  createdAt?: Date;
};

const ACTIVE_APPOINTMENT_STATUSES: WalkthroughAppointmentStatus[] = [
  WalkthroughAppointmentStatus.SCHEDULED,
  WalkthroughAppointmentStatus.RESCHEDULED,
];

/** Prefer live booking over latest row when multiple appointments exist. */
export function pickWalkthroughAppointmentForPipeline<T extends AppointmentForPipeline>(
  appointments: T[],
): T | null {
  if (appointments.length === 0) {
    return null;
  }
  const sorted = [...appointments].sort((a, b) => {
    const aTime = a.createdAt?.getTime() ?? 0;
    const bTime = b.createdAt?.getTime() ?? 0;
    return bTime - aTime;
  });
  const active = sorted.find((row) => ACTIVE_APPOINTMENT_STATUSES.includes(row.status));
  return active ?? sorted[0] ?? null;
}

type PipelineInput = {
  clientStatus: ClientStatus;
  requestStatus: RequestStatus | null;
  linkStatus: WalkthroughSchedulingLinkStatus | null;
  appointmentStatus: WalkthroughAppointmentStatus | null;
  fitDecision: WalkthroughFitDecision | null;
  recapSentAt: Date | null;
};

export function deriveWalkthroughPipelineStage(
  input: PipelineInput,
): WalkthroughPipelineStage {
  if (input.clientStatus === ClientStatus.ACTIVE) {
    return "active_client";
  }
  if (
    input.requestStatus === RequestStatus.CANCELLED ||
    input.fitDecision === WalkthroughFitDecision.NOT_A_FIT
  ) {
    return "not_a_fit";
  }
  if (input.recapSentAt || input.requestStatus === RequestStatus.COMPLETE) {
    return "proposal_setup";
  }
  if (
    input.appointmentStatus === WalkthroughAppointmentStatus.COMPLETED ||
    input.appointmentStatus === WalkthroughAppointmentStatus.NO_SHOW
  ) {
    return input.recapSentAt ? "recap" : "completed";
  }
  if (
    input.appointmentStatus === WalkthroughAppointmentStatus.SCHEDULED ||
    input.appointmentStatus === WalkthroughAppointmentStatus.RESCHEDULED
  ) {
    return "scheduled";
  }
  if (input.appointmentStatus === WalkthroughAppointmentStatus.CANCELED) {
    return "booking_canceled";
  }
  if (input.linkStatus === WalkthroughSchedulingLinkStatus.ACTIVE) {
    return "link_sent";
  }
  if (input.linkStatus === WalkthroughSchedulingLinkStatus.USED) {
    if (
      input.appointmentStatus === WalkthroughAppointmentStatus.SCHEDULED ||
      input.appointmentStatus === WalkthroughAppointmentStatus.RESCHEDULED
    ) {
      return "scheduled";
    }
    return "booking_canceled";
  }
  if (input.requestStatus === RequestStatus.NEEDS_INFO) {
    return "awaiting_info";
  }
  if (
    input.requestStatus === RequestStatus.REVIEWED ||
    input.requestStatus === RequestStatus.IN_PROGRESS
  ) {
    return "qualified";
  }
  return "new_request";
}

export const WALKTHROUGH_PIPELINE_RAIL = [
  { id: "request", label: "Request", stages: ["new_request"] as WalkthroughPipelineStage[] },
  {
    id: "qualify",
    label: "Qualify",
    stages: ["awaiting_info", "qualified"] as WalkthroughPipelineStage[],
  },
  {
    id: "schedule",
    label: "Schedule",
    stages: ["link_sent", "booking_canceled"] as WalkthroughPipelineStage[],
  },
  {
    id: "walkthrough",
    label: "Walkthrough",
    stages: ["scheduled", "completed"] as WalkthroughPipelineStage[],
  },
  { id: "recap", label: "Recap", stages: ["recap"] as WalkthroughPipelineStage[] },
  {
    id: "decision",
    label: "Decision",
    stages: ["proposal_setup", "not_a_fit"] as WalkthroughPipelineStage[],
  },
] as const;

export type WalkthroughStageConfig = {
  heading: string;
  description: string;
  primaryLabel: string;
  secondaryLabels: string[];
};

export function getWalkthroughPipelineStageLabel(
  stage: WalkthroughPipelineStage,
): string {
  switch (stage) {
    case "new_request":
      return "Needs review";
    case "awaiting_info":
      return "Awaiting response";
    case "qualified":
      return "Ready to schedule";
    case "link_sent":
      return "Link sent";
    case "booking_canceled":
      return "Canceled";
    case "scheduled":
      return "Scheduled";
    case "completed":
      return "Completed";
    case "recap":
      return "Recap ready";
    case "proposal_setup":
      return "Ready to activate";
    case "active_client":
      return "Active client";
    case "not_a_fit":
      return "Not a fit";
  }
}

export type WalkthroughPipelineBadgeVariant =
  | "default"
  | "secondary"
  | "destructive"
  | "outline";

export function getWalkthroughPipelineStageBadgeVariant(
  stage: WalkthroughPipelineStage,
): WalkthroughPipelineBadgeVariant {
  switch (stage) {
    case "new_request":
      return "destructive";
    case "awaiting_info":
      return "outline";
    case "qualified":
    case "link_sent":
      return "secondary";
    case "booking_canceled":
      return "destructive";
    case "scheduled":
    case "completed":
    case "recap":
      return "default";
    case "proposal_setup":
      return "outline";
    case "active_client":
      return "default";
    case "not_a_fit":
      return "outline";
  }
}

export function getWalkthroughStageConfig(
  stage: WalkthroughPipelineStage,
): WalkthroughStageConfig {
  switch (stage) {
    case "new_request":
      return {
        heading: "Walkthrough not scheduled",
        description:
          "This company submitted a walkthrough request but does not have an active scheduling link yet (scheduling may be unavailable or link creation failed). Review their needs or send a scheduling link manually.",
        primaryLabel: "Review request",
        secondaryLabels: ["Mark not a fit", "Request more info"],
      };
    case "awaiting_info":
      return {
        heading: "Waiting on prospect",
        description:
          "You asked for more information. They'll reply by email. Qualify when you're ready to schedule.",
        primaryLabel: "Qualify prospect",
        secondaryLabels: ["Request more info", "Mark not a fit"],
      };
    case "qualified":
      return {
        heading: "Ready to schedule",
        description: "This prospect looks worth a conversation. Send a secure scheduling link.",
        primaryLabel: "Send scheduling link",
        secondaryLabels: ["Mark not a fit"],
      };
    case "link_sent":
      return {
        heading: "Awaiting booking",
        description:
          "The prospect can pick a time on the self-serve scheduling page (usually right after they submit the request form). Resend or regenerate the link if they need a fresh one.",
        primaryLabel: "Copy scheduling link",
        secondaryLabels: ["Resend link", "Regenerate link", "Revoke link"],
      };
    case "booking_canceled":
      return {
        heading: "Booking canceled",
        description:
          "The prospect canceled their time. Regenerate the scheduling link or follow up to reschedule.",
        primaryLabel: "Regenerate scheduling link",
        secondaryLabels: ["Open walkthrough workspace"],
      };
    case "scheduled":
      return {
        heading: "Walkthrough scheduled",
        description: "Discovery call is on the calendar. Prepare and run the walkthrough.",
        primaryLabel: "Open walkthrough workspace",
        secondaryLabels: ["Reschedule", "Cancel", "Mark no-show"],
      };
    case "completed":
      return {
        heading: "Walkthrough completed",
        description: "Capture recap and decide whether to move forward.",
        primaryLabel: "Create recap",
        secondaryLabels: ["Activate as client", "Needs follow-up", "Not a fit"],
      };
    case "recap":
      return {
        heading: "Recap ready",
        description: "Send recap or make a fit decision.",
        primaryLabel: "Send recap",
        secondaryLabels: ["Activate as client", "Not a fit"],
      };
    case "proposal_setup":
      return {
        heading: "Ready to activate",
        description: "Configure scope, billing, and portal access in Setup.",
        primaryLabel: "Configure scope / billing",
        secondaryLabels: ["Open setup"],
      };
    case "active_client":
      return {
        heading: "Active client",
        description: "Walkthrough complete and client is active.",
        primaryLabel: "View setup",
        secondaryLabels: [],
      };
    case "not_a_fit":
      return {
        heading: "Not a fit",
        description: "This prospect was marked not a fit.",
        primaryLabel: "View request",
        secondaryLabels: [],
      };
  }
}
