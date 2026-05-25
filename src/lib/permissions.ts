import type { ClientRole, StaffRole } from "@/generated/prisma/client";

export type StaffCapability =
  | "staff.manage"
  | "billing.manage"
  | "catalog.manage"
  | "clients.manage"
  | "ops.full";

export type ClientCapability =
  | "team.manage"
  | "billing.view"
  | "disbursement.approve"
  | "portal.work";

const STAFF_CAPABILITIES: Record<StaffRole, readonly StaffCapability[]> = {
  OWNER: [
    "staff.manage",
    "billing.manage",
    "catalog.manage",
    "clients.manage",
    "ops.full",
  ],
  MEMBER: ["clients.manage", "ops.full"],
};

const CLIENT_CAPABILITIES: Record<ClientRole, readonly ClientCapability[]> = {
  OWNER: ["team.manage", "billing.view", "disbursement.approve", "portal.work"],
  MEMBER: ["portal.work"],
};

export function staffHasCapability(
  role: StaffRole,
  capability: StaffCapability,
): boolean {
  return STAFF_CAPABILITIES[role].includes(capability);
}

export function clientHasCapability(
  role: ClientRole,
  capability: ClientCapability,
): boolean {
  return CLIENT_CAPABILITIES[role].includes(capability);
}

export function resolveStaffRole(role: StaffRole | null | undefined): StaffRole {
  return role ?? "OWNER";
}

export function resolveClientRole(role: ClientRole | null | undefined): ClientRole {
  return role ?? "OWNER";
}
