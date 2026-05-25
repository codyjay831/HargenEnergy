import { ClientStatus } from "@/generated/prisma/client";

export type IntakeClientMutationStrategy =
  | "create"
  | "update-lead"
  | "preserve-existing";

export function getIntakeClientMutationStrategy(
  existingStatus: ClientStatus | null | undefined,
): IntakeClientMutationStrategy {
  if (!existingStatus) {
    return "create";
  }
  if (existingStatus === ClientStatus.LEAD) {
    return "update-lead";
  }
  return "preserve-existing";
}
