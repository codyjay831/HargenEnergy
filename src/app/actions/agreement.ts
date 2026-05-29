"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { AgreementStatus } from "@/generated/prisma/client";
import { requireStaff } from "@/lib/auth-guards";
import { prisma } from "@/lib/prisma";
import {
  buildAgreementUpdateData,
  validateAgreementTransition,
} from "@/lib/client-agreement";
import { writeAuditLog } from "@/lib/audit-log";
import {
  revalidateAdminClientPage,
  revalidatePortalClientSurfaces,
} from "@/lib/revalidate-paths";

const agreementTransitionSchema = z.object({
  clientId: z.string().min(1),
  toStatus: z.nativeEnum(AgreementStatus),
  agreementUrl: z.string().optional().nullable(),
  agreementNotes: z.string().max(2000).optional().nullable(),
  note: z.string().max(2000).optional().nullable(),
  overrideReason: z.string().max(500).optional().nullable(),
  signedAt: z.string().datetime().optional().nullable(),
});

async function transitionClientAgreement(
  raw: z.infer<typeof agreementTransitionSchema>,
) {
  const session = await requireStaff("clients.manage");

  const parsed = agreementTransitionSchema.safeParse(raw);
  if (!parsed.success) {
    return { error: "Invalid agreement fields." };
  }

  const {
    clientId,
    toStatus,
    agreementUrl,
    agreementNotes,
    note,
    overrideReason,
    signedAt,
  } = parsed.data;

  const client = await prisma.client.findUnique({
    where: { id: clientId },
    select: {
      id: true,
      agreementStatus: true,
      agreementNotes: true,
    },
  });

  if (!client) {
    return { error: "Client not found." };
  }

  const validation = validateAgreementTransition({
    from: client.agreementStatus,
    to: toStatus,
    note,
    overrideReason,
    agreementUrl,
  });

  if (!validation.ok) {
    return { error: validation.error };
  }

  const mergedNotes =
    note?.trim() && toStatus !== client.agreementStatus
      ? [client.agreementNotes, note.trim()].filter(Boolean).join("\n\n")
      : agreementNotes !== undefined
        ? agreementNotes?.trim() || null
        : undefined;

  const updateData = buildAgreementUpdateData({
    from: client.agreementStatus,
    to: toStatus,
    agreementUrl,
    agreementNotes: mergedNotes,
    overrideReason,
    signedAt: signedAt ? new Date(signedAt) : undefined,
  });

  try {
    const updated = await prisma.client.update({
      where: { id: clientId },
      data: updateData,
      select: {
        id: true,
        agreementStatus: true,
        agreementSentAt: true,
        agreementSignedAt: true,
        agreementUrl: true,
        agreementNotes: true,
        agreementOverrideReason: true,
      },
    });

    if (toStatus !== client.agreementStatus) {
      await writeAuditLog({
        actorUserId: session.user.id,
        action: "agreement.status_changed",
        entityType: "Client",
        entityId: clientId,
        metadata: {
          from: client.agreementStatus,
          to: toStatus,
          note: note?.trim() || null,
          overrideReason: overrideReason?.trim() || null,
        },
      });
    }

    revalidateAdminClientPage(clientId);
    revalidatePortalClientSurfaces();
    revalidatePath("/admin/clients");

    return { success: true, client: updated };
  } catch (error) {
    console.error("Error updating agreement:", error);
    return { error: "Failed to update agreement status." };
  }
}

export async function markAgreementSent(data: {
  clientId: string;
  agreementUrl?: string | null;
  agreementNotes?: string | null;
}) {
  return transitionClientAgreement({
    clientId: data.clientId,
    toStatus: AgreementStatus.SENT,
    agreementUrl: data.agreementUrl ?? null,
    agreementNotes: data.agreementNotes ?? null,
  });
}

export async function markAgreementSigned(data: {
  clientId: string;
  signedAt?: string | null;
  agreementNotes?: string | null;
}) {
  return transitionClientAgreement({
    clientId: data.clientId,
    toStatus: AgreementStatus.SIGNED,
    signedAt: data.signedAt ?? null,
    agreementNotes: data.agreementNotes ?? null,
  });
}

export async function markAgreementNotSent(data: {
  clientId: string;
  note: string;
}) {
  return transitionClientAgreement({
    clientId: data.clientId,
    toStatus: AgreementStatus.NOT_SENT,
    note: data.note,
  });
}

export async function waiveAgreementRequirement(data: {
  clientId: string;
  overrideReason: string;
  agreementNotes?: string | null;
}) {
  return transitionClientAgreement({
    clientId: data.clientId,
    toStatus: AgreementStatus.WAIVED,
    overrideReason: data.overrideReason,
    agreementNotes: data.agreementNotes ?? null,
  });
}

export async function revertAgreementToSent(data: {
  clientId: string;
  note: string;
}) {
  return transitionClientAgreement({
    clientId: data.clientId,
    toStatus: AgreementStatus.SENT,
    note: data.note,
  });
}
