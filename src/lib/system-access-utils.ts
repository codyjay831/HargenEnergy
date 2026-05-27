import { SystemAccessStatus } from "@/generated/prisma/client";

/** Counts system access rows still awaiting client-provided credentials. */
export function countPendingSystemAccess(
  statuses: SystemAccessStatus[],
): number {
  return statuses.filter((s) => s === SystemAccessStatus.NOT_PROVIDED).length;
}
