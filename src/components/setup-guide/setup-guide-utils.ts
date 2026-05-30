import type {
  ClientSetupStep,
  SetupStepBlocker,
  SetupStepOwner,
  SetupStepStatus,
} from "@/lib/client-setup-readiness";

export type RailNodeState =
  | "complete"
  | "current"
  | "blocked"
  | "attention"
  | "optional"
  | "future";

export type SetupRailConfig = {
  id: string;
  label: string;
  stepIds: string[];
};

export const ADMIN_SETUP_RAIL: SetupRailConfig[] = [
  { id: "client", label: "Client", stepIds: ["lifecycle-active"] },
  { id: "scope", label: "Scope", stepIds: ["approved-work", "capacity"] },
  { id: "agreement", label: "Agreement", stepIds: ["service-agreement"] },
  { id: "billing", label: "Billing", stepIds: ["billing"] },
  { id: "access", label: "Access", stepIds: ["system-access-admin", "customer-system-access"] },
  { id: "invite", label: "Invite", stepIds: ["portal-invite", "portal-access"] },
  { id: "first-work", label: "First work", stepIds: ["first-work"] },
];

export const ADMIN_NEXT_STEP_ORDER = [
  "lifecycle-active",
  "approved-work",
  "service-agreement",
  "billing",
  "system-access-admin",
  "portal-invite",
  "portal-access",
  "customer-system-access",
  "capacity",
  "first-work",
  "discovery-reviewed",
];

export const CUSTOMER_SETUP_RAIL: SetupRailConfig[] = [
  { id: "portal", label: "Portal", stepIds: ["portal-access-ready"] },
  { id: "agreement", label: "Agreement", stepIds: ["customer-agreement"] },
  { id: "billing", label: "Billing", stepIds: ["customer-billing"] },
  { id: "support", label: "Support areas", stepIds: ["support-areas-visible"] },
];

export const CUSTOMER_NEXT_STEP_ORDER = [
  "portal-access-ready",
  "customer-agreement",
  "customer-billing",
  "support-areas-visible",
];

export type SetupRailNode = SetupRailConfig & { state: RailNodeState };

export function computeRailNodes(
  steps: ClientSetupStep[],
  railConfig: SetupRailConfig[],
): SetupRailNode[] {
  const stepMap = new Map(steps.map((step) => [step.id, step]));
  let foundCurrent = false;

  return railConfig.map((config) => {
    const nodeSteps = config.stepIds
      .map((id) => stepMap.get(id))
      .filter((step): step is ClientSetupStep => step != null);
    const relevantSteps = nodeSteps.filter((step) => step.status !== "not_required");

    if (relevantSteps.length === 0 || relevantSteps.every((step) => step.status === "complete")) {
      return { ...config, state: "complete" as RailNodeState };
    }

    if (foundCurrent) {
      return { ...config, state: "future" as RailNodeState };
    }

    foundCurrent = true;

    if (relevantSteps.some((step) => step.status === "blocked")) {
      return { ...config, state: "blocked" as RailNodeState };
    }
    if (relevantSteps.some((step) => step.status === "attention")) {
      return { ...config, state: "attention" as RailNodeState };
    }
    if (
      relevantSteps.every(
        (step) =>
          step.status === "complete" ||
          (step.status === "incomplete" && !step.required),
      ) &&
      relevantSteps.some((step) => step.status === "incomplete")
    ) {
      return { ...config, state: "optional" as RailNodeState };
    }

    return { ...config, state: "current" as RailNodeState };
  });
}

export function findNextStep(
  steps: ClientSetupStep[],
  order: string[],
): ClientSetupStep | null {
  const stepMap = new Map(steps.map((step) => [step.id, step]));

  for (const id of order) {
    const step = stepMap.get(id);
    if (!step) continue;
    if (step.status === "complete" || step.status === "not_required") continue;
    return step;
  }

  return null;
}

export function findNextRequiredStep(
  steps: ClientSetupStep[],
  order: string[],
): ClientSetupStep | null {
  const stepMap = new Map(steps.map((step) => [step.id, step]));

  for (const id of order) {
    const step = stepMap.get(id);
    if (!step) continue;
    if (!step.required) continue;
    if (step.status === "complete" || step.status === "not_required") continue;
    return step;
  }

  return null;
}

export function ownerLabel(owner: SetupStepOwner, variant: "admin" | "customer"): string {
  if (variant === "customer") {
    if (owner === "admin" || owner === "system" || owner === "stripe") return "Hargen";
    if (owner === "customer") return "You";
  }

  switch (owner) {
    case "admin":
      return "Admin";
    case "customer":
      return "Customer";
    case "system":
      return "Hargen";
    case "stripe":
      return "System";
    default:
      return owner;
  }
}

export function blockerNote(
  step: ClientSetupStep,
  variant: "admin" | "customer",
): string | null {
  if (step.blockers.includes("blocks_invite")) {
    return variant === "admin" ? "Blocks portal invite" : null;
  }
  if (step.blockers.includes("blocks_submit")) {
    return variant === "admin" ? "Blocks work submission" : "Send work is blocked until setup is complete";
  }
  if (step.blockers.includes("blocks_billing")) {
    return variant === "admin"
      ? "Billing setup in progress"
      : "Billing setup is still in progress with Hargen";
  }
  return null;
}

export function optionalNote(step: ClientSetupStep): string | null {
  if (step.required || step.status === "complete" || step.status === "not_required") {
    return null;
  }
  return "Optional — can be completed later";
}

export function adminStatusLabel(step: ClientSetupStep): string {
  if (step.status === "complete") return "Complete";
  if (step.status === "not_required") return "Not required";
  if (step.status === "attention") return "Needs attention";
  if (step.status === "blocked") return "Blocked";
  if (step.owner === "customer") return "Waiting on customer";
  if (step.owner === "system" || step.owner === "stripe") return "Waiting on Hargen";
  return "Needs action";
}

export function customerStatusLabel(step: ClientSetupStep): string {
  if (step.status === "complete") return "Complete";
  if (step.status === "not_required") return "Not required";
  if (step.status === "attention") return "Needs attention";
  if (step.status === "blocked") return "Blocked";
  if (step.owner === "admin") return "Waiting on Hargen";
  if (step.owner === "system" || step.owner === "stripe") return "In progress";
  return "Your action";
}

export function stepStatusTone(status: SetupStepStatus): "success" | "danger" | "warning" | "neutral" {
  if (status === "complete") return "success";
  if (status === "blocked") return "danger";
  if (status === "attention") return "warning";
  return "neutral";
}

export function railStateTone(state: RailNodeState): string {
  switch (state) {
    case "complete":
      return "border-emerald-200 bg-emerald-50 text-emerald-800";
    case "current":
      return "border-sky-300 bg-sky-50 text-sky-900 ring-2 ring-sky-200";
    case "blocked":
      return "border-red-200 bg-red-50 text-red-800";
    case "attention":
      return "border-amber-200 bg-amber-50 text-amber-900";
    case "optional":
      return "border-amber-200/70 bg-amber-50/60 text-amber-800";
    default:
      return "border-border bg-muted/40 text-muted-foreground";
  }
}

export function adminBlockerBadgeLabel(blockers: SetupStepBlocker[]): string {
  if (blockers.includes("blocks_invite")) return "Blocks invite";
  if (blockers.includes("blocks_submit")) return "Blocks submit";
  if (blockers.includes("blocks_billing")) return "Billing setup";
  return "Informational";
}

export function customerBlockerBadgeLabel(blockers: SetupStepBlocker[]): string {
  if (blockers.includes("blocks_submit")) return "Send work blocked";
  if (blockers.includes("blocks_billing")) return "Billing setup";
  if (blockers.includes("blocks_invite")) return "Invite pending";
  return "Informational";
}
