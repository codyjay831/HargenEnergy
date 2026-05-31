import { RequestStatus } from "@/lib/enums";
import { isNeedsInfoActive } from "@/lib/portal-info-response";
import type { Prisma } from "@/generated/prisma/client";

export { isNeedsInfoActive };

/** Prisma where clause: needsInfo flag OR NEEDS_INFO status (aligned with portal). */
export function needsInfoWhereClause(): Prisma.SupportRequestWhereInput {
  return {
    OR: [{ needsInfo: true }, { status: RequestStatus.NEEDS_INFO }],
  };
}

export function getAdminNotificationTypeLabel(type: string): string {
  switch (type) {
    case "CLIENT_INFO_RESPONSE":
      return "Client responded";
    case "CLIENT_COMMENT":
      return "New client message";
    default:
      return "Client activity";
  }
}
