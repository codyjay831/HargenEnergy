import {
  ClientStatus,
  RequestStatus,
  DiscoveryAppointmentStatus,
  DiscoveryFitDecision,
  DiscoverySchedulingLinkStatus,
} from "@/generated/prisma/client";

export type DiscoveryPipelineStage =
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
  status: DiscoveryAppointmentStatus;
  fitDecision?: DiscoveryFitDecision | null;
  recapSentAt?: Date | null;
  createdAt?: Date;
};

const ACTIVE_APPOINTMENT_STATUSES: DiscoveryAppointmentStatus[] = [
  DiscoveryAppointmentStatus.SCHEDULED,
  DiscoveryAppointmentStatus.RESCHEDULED,
];

/** Prefer live booking over latest row when multiple appointments exist. */
export function pickDiscoveryAppointmentForPipeline<T extends AppointmentForPipeline>(
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
  linkStatus: DiscoverySchedulingLinkStatus | null;
  appointmentStatus: DiscoveryAppointmentStatus | null;
  fitDecision: DiscoveryFitDecision | null;
  recapSentAt: Date | null;
};

export function deriveDiscoveryPipelineStage(
  input: PipelineInput,
): DiscoveryPipelineStage {
  if (input.clientStatus === ClientStatus.ACTIVE) {
    return "active_client";
  }
  if (
    input.requestStatus === RequestStatus.CANCELLED ||
    input.fitDecision === DiscoveryFitDecision.NOT_A_FIT
  ) {
    return "not_a_fit";
  }
  if (input.recapSentAt || input.requestStatus === RequestStatus.COMPLETE) {
    return "proposal_setup";
  }
  if (
    input.appointmentStatus === DiscoveryAppointmentStatus.COMPLETED ||
    input.appointmentStatus === DiscoveryAppointmentStatus.NO_SHOW
  ) {
    return input.recapSentAt ? "recap" : "completed";
  }
  if (
    input.appointmentStatus === DiscoveryAppointmentStatus.SCHEDULED ||
    input.appointmentStatus === DiscoveryAppointmentStatus.RESCHEDULED
  ) {
    return "scheduled";
  }
  if (input.appointmentStatus === DiscoveryAppointmentStatus.CANCELED) {
    return "booking_canceled";
  }
  if (input.linkStatus === DiscoverySchedulingLinkStatus.ACTIVE) {
    return "link_sent";
  }
  if (input.linkStatus === DiscoverySchedulingLinkStatus.USED) {
    if (
      input.appointmentStatus === DiscoveryAppointmentStatus.SCHEDULED ||
      input.appointmentStatus === DiscoveryAppointmentStatus.RESCHEDULED
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

export const DISCOVERY_PIPELINE_RAIL = [
  { id: "request", label: "Request", stages: ["new_request"] as DiscoveryPipelineStage[] },
  {
    id: "qualify",
    label: "Qualify",
    stages: ["awaiting_info", "qualified"] as DiscoveryPipelineStage[],
  },
  {
    id: "schedule",
    label: "Schedule",
    stages: ["link_sent", "booking_canceled"] as DiscoveryPipelineStage[],
  },
  {
    id: "discovery",
    label: "Discovery",
    stages: ["scheduled", "completed"] as DiscoveryPipelineStage[],
  },
  { id: "recap", label: "Recap", stages: ["recap"] as DiscoveryPipelineStage[] },
  {
    id: "decision",
    label: "Decision",
    stages: ["proposal_setup", "not_a_fit"] as DiscoveryPipelineStage[],
  },
] as const;

export type DiscoveryStageConfig = {
  heading: string;
  description: string;
  primaryLabel: string;
  secondaryLabels: string[];
};

export function getDiscoveryPipelineStageLabel(
  stage: DiscoveryPipelineStage,
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

export type DiscoveryPipelineBadgeVariant =
  | "default"
  | "secondary"
  | "destructive"
  | "outline";

export function getDiscoveryPipelineStageBadgeVariant(
  stage: DiscoveryPipelineStage,
): DiscoveryPipelineBadgeVariant {
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

export function getDiscoveryStageConfig(
  stage: DiscoveryPipelineStage,
): DiscoveryStageConfig {
  switch (stage) {
    case "new_request":
      return {
        heading: "Discovery not scheduled",
        description:
          "This company submitted a discovery request but does not have an active scheduling link yet (scheduling may be unavailable or link creation failed). Review their needs or send a scheduling link manually.",
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
        secondaryLabels: ["Open discovery workspace"],
      };
    case "scheduled":
      return {
        heading: "Discovery scheduled",
        description: "Discovery call is on the calendar. Prepare and run the discovery.",
        primaryLabel: "Open discovery workspace",
        secondaryLabels: ["Reschedule", "Cancel", "Mark no-show"],
      };
    case "completed":
      return {
        heading: "Discovery completed",
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
        description: "Discovery complete and client is active.",
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
