export type IntakeSupportGroup =
  | "operations"
  | "customer-facing"
  | "compliance"
  | "admin";

export type IntakeSupportOption = {
  id: string;
  label: string;
  group: IntakeSupportGroup;
};

export const INTAKE_SUPPORT_OPTIONS: IntakeSupportOption[] = [
  { id: "quote", label: "Quote building / proposal support", group: "customer-facing" },
  { id: "scheduling", label: "Scheduling support", group: "operations" },
  { id: "customer", label: "Customer communication", group: "customer-facing" },
  { id: "permit", label: "Permit follow-up", group: "compliance" },
  { id: "utility", label: "PG&E / utility applications", group: "compliance" },
  { id: "enphase", label: "Enphase setup", group: "compliance" },
  { id: "plans", label: "Plan set coordination", group: "compliance" },
  { id: "parts", label: "Parts ordering", group: "operations" },
  { id: "crm", label: "CRM cleanup", group: "admin" },
  { id: "stuck", label: "Stuck job follow-up", group: "operations" },
  { id: "crew", label: "Crew coordination", group: "operations" },
  { id: "general", label: "General solar back-office support", group: "admin" },
  { id: "not-sure", label: "Not sure yet", group: "admin" },
];

export const INTAKE_SUPPORT_GROUP_LABELS: Record<IntakeSupportGroup, string> = {
  operations: "Operations",
  "customer-facing": "Customer-facing",
  compliance: "Permits & compliance",
  admin: "Admin & general",
};

export function getIntakeSupportLabel(id: string): string {
  return INTAKE_SUPPORT_OPTIONS.find((o) => o.id === id)?.label ?? id;
}

export function groupIntakeSupportOptions(): {
  group: IntakeSupportGroup;
  label: string;
  options: IntakeSupportOption[];
}[] {
  const groups = Object.entries(INTAKE_SUPPORT_GROUP_LABELS) as [IntakeSupportGroup, string][];
  return groups.map(([group, label]) => ({
    group,
    label,
    options: INTAKE_SUPPORT_OPTIONS.filter((o) => o.group === group),
  }));
}
