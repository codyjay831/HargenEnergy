/**
 * Display labels for discovery intakePlan metadata (qualification hint only — not scope).
 */

const INTAKE_PLAN_LABELS: Record<string, string> = {
  "hours-target": "Prepaid weekly hours",
  "request-based": "Request-Based Work",
  "one-time": "One-time / request-based",
  "not-sure": "Not sure yet",
};

export function formatIntakePlanLabel(intakePlan: string | undefined | null): string {
  if (!intakePlan) {
    return "Not specified";
  }
  return INTAKE_PLAN_LABELS[intakePlan] ?? intakePlan;
}
