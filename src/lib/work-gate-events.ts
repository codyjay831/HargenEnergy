import type { PortalSubmitBlockReason } from "@/lib/portal-submit-eligibility";

export type WorkGateEntryPoint =
  | "portal_submit"
  | "admin_log_ops_request"
  | "admin_start_timer"
  | "admin_pause_timer"
  | "admin_stop_timer"
  | "admin_create_time_entry"
  | "admin_update_time_entry"
  | "admin_request_in_progress";

export type WorkGateEventOutcome = "allowed" | "blocked";

export type WorkGateEvent = {
  outcome: WorkGateEventOutcome;
  entryPoint: WorkGateEntryPoint;
  clientId?: string;
  reasonCode?: PortalSubmitBlockReason | "client_not_found" | "task_not_in_scope" | "task_inactive";
  requestId?: string;
  workTaskId?: string;
  actorId?: string;
  ts: string;
};

/** Structured gate telemetry for ops debugging (console in all envs except test). */
export function logWorkGateEvent(
  event: Omit<WorkGateEvent, "ts">,
): void {
  if (process.env.NODE_ENV === "test") {
    return;
  }

  const payload: WorkGateEvent = {
    ...event,
    ts: new Date().toISOString(),
  };

  console.info("[work-gate]", JSON.stringify(payload));
}
