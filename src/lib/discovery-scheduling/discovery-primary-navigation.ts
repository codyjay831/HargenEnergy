import { adminClientTabHref } from "@/lib/admin-client-tabs";

import type { DiscoveryPipelineStage } from "./pipeline";

export type DiscoveryPrimaryNavigation =
  | { kind: "tab"; href: string }
  | { kind: "discovery_tab" }
  | { kind: "none" };

export function resolveDiscoveryPrimaryNavigation(
  stage: DiscoveryPipelineStage,
  clientId: string,
): DiscoveryPrimaryNavigation {
  switch (stage) {
    case "proposal_setup":
    case "active_client":
      return { kind: "tab", href: adminClientTabHref(clientId, "setup") };
    case "new_request":
    case "scheduled":
    case "completed":
    case "recap":
      return { kind: "discovery_tab" };
    case "not_a_fit":
      return { kind: "none" };
    default:
      return { kind: "none" };
  }
}

export function resolveDiscoverySetupTabHref(clientId: string): string {
  return adminClientTabHref(clientId, "setup");
}
