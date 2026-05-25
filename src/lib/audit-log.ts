import { Prisma } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";

export type AuditLogInput = {
  actorUserId?: string | null;
  action: string;
  entityType: string;
  entityId: string;
  metadata?: Record<string, unknown> | null;
};

export async function writeAuditLog(input: AuditLogInput): Promise<void> {
  try {
    const metadata =
      input.metadata == null
        ? Prisma.JsonNull
        : (input.metadata as Prisma.InputJsonValue);
    await prisma.auditLog.create({
      data: {
        actorUserId: input.actorUserId ?? null,
        action: input.action,
        entityType: input.entityType,
        entityId: input.entityId,
        metadata,
      },
    });
  } catch (error) {
    console.error("Failed to write audit log:", error);
  }
}
