"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import {
  AgreementPacketStatus,
  AgreementServiceType,
  Prisma,
} from "@/generated/prisma/client";
import { requireStaff } from "@/lib/auth-guards";
import { prisma } from "@/lib/prisma";
import { writeAuditLog } from "@/lib/audit-log";
import {
  AGREEMENT_EVENT_TYPES,
  writeAgreementPacketEvent,
} from "@/lib/agreements/events";
import {
  buildPacketSnapshot,
  parseStoredSnapshot,
} from "@/lib/agreements/snapshot";
import { storeAgreementPdf } from "@/lib/agreements/storage";
import {
  canEditPacketDraft,
  canGeneratePacket,
  canMarkSentManually,
  canReturnToDraft,
  canSupersedePacket,
  canVoidPacket,
  isPacketImmutable,
} from "@/lib/agreements/status";
import { getPrivateBlobErrorMessage } from "@/lib/agreements/blob-guard";
import { getDefaultTemplatePair } from "@/lib/agreements/ensure-templates";
import type {
  CustomScope,
  RequestBasedScope,
  SupportBlockScope,
} from "@/lib/agreements/types";

const supportBlockScopeSchema = z.object({
  planName: z.string().min(1),
  hoursPerPeriod: z.number().positive(),
  period: z.enum(["WEEKLY", "MONTHLY"]),
  priceCents: z.number().int().nonnegative(),
  billingCadence: z.string().min(1),
  startDate: z.string().min(1),
  renewalTerms: z.string().min(1),
  cancellationTerms: z.string().min(1),
  unusedTimePolicy: z.string().min(1),
  includedCategories: z.array(z.string()),
  excludedCategories: z.array(z.string()),
  accessRequired: z.string().min(1),
  approvalRules: z.string().min(1),
  specialNotes: z.string().optional(),
});

const requestBasedScopeSchema = z.object({
  requestTitle: z.string().min(1),
  flatFeeCents: z.number().int().nonnegative().optional(),
  estimateRange: z.string().optional(),
  deliverables: z.string().min(1),
  assumptions: z.string().min(1),
  exclusions: z.string().min(1),
  requiredClientInfo: z.string().min(1),
  approvalRules: z.string().min(1),
  targetTurnaround: z.string().optional(),
  specialNotes: z.string().optional(),
});

const customScopeSchema = z.object({
  description: z.string().min(1),
  specialNotes: z.string().optional(),
});

const packetFieldsSchema = z.object({
  clientId: z.string().min(1),
  clientServicesTemplateId: z.string().min(1),
  workAuthorizationTemplateId: z.string().min(1),
  companyLegalName: z.string().min(1),
  companyDba: z.string().optional().nullable(),
  companyAddress: z.string().optional().nullable(),
  signerName: z.string().min(1),
  signerTitle: z.string().min(1),
  signerEmail: z.string().email(),
  serviceType: z.nativeEnum(AgreementServiceType),
  selectedScopeJson: z.union([
    supportBlockScopeSchema,
    requestBasedScopeSchema,
    customScopeSchema,
  ]),
  pricingJson: z.record(z.string(), z.unknown()).optional().nullable(),
  billingJson: z.record(z.string(), z.unknown()).optional().nullable(),
});

function revalidateAgreementSurfaces(clientId: string, packetId?: string) {
  revalidatePath("/admin/agreements");
  revalidatePath(`/admin/clients/${clientId}`);
  if (packetId) {
    revalidatePath(`/admin/agreements/${packetId}`);
  }
}

async function loadPacketOrError(packetId: string) {
  const packet = await prisma.agreementPacket.findUnique({
    where: { id: packetId },
    include: {
      clientServicesTemplate: true,
      workAuthorizationTemplate: true,
    },
  });
  if (!packet) {
    return { error: "Agreement packet not found." as const };
  }
  return { packet };
}

export async function createAgreementPacket(
  raw: z.infer<typeof packetFieldsSchema>,
) {
  const session = await requireStaff("clients.manage");
  const parsed = packetFieldsSchema.safeParse(raw);
  if (!parsed.success) {
    return { error: "Invalid agreement packet fields." };
  }

  const client = await prisma.client.findUnique({
    where: { id: parsed.data.clientId },
    select: { id: true },
  });
  if (!client) {
    return { error: "Client not found." };
  }

  try {
    const packet = await prisma.agreementPacket.create({
      data: {
        clientId: parsed.data.clientId,
        status: AgreementPacketStatus.DRAFT,
        clientServicesTemplateId: parsed.data.clientServicesTemplateId,
        workAuthorizationTemplateId: parsed.data.workAuthorizationTemplateId,
        companyLegalName: parsed.data.companyLegalName.trim(),
        companyDba: parsed.data.companyDba?.trim() || null,
        companyAddress: parsed.data.companyAddress?.trim() || null,
        signerName: parsed.data.signerName.trim(),
        signerTitle: parsed.data.signerTitle.trim(),
        signerEmail: parsed.data.signerEmail.trim().toLowerCase(),
        serviceType: parsed.data.serviceType,
        selectedScopeJson: parsed.data.selectedScopeJson as SupportBlockScope | RequestBasedScope | CustomScope,
        pricingJson: (parsed.data.pricingJson ?? undefined) as
          | Prisma.InputJsonValue
          | undefined,
        billingJson: (parsed.data.billingJson ?? undefined) as
          | Prisma.InputJsonValue
          | undefined,
        createdByUserId: session.user.id!,
      },
    });

    await writeAgreementPacketEvent({
      agreementPacketId: packet.id,
      eventType: AGREEMENT_EVENT_TYPES.CREATED,
      actorUserId: session.user.id,
      actorEmail: session.user.email ?? null,
    });

    await writeAuditLog({
      actorUserId: session.user.id,
      action: "agreement_packet.created",
      entityType: "AgreementPacket",
      entityId: packet.id,
      metadata: { clientId: packet.clientId },
    });

    revalidateAgreementSurfaces(packet.clientId, packet.id);
    return { success: true, packetId: packet.id };
  } catch (error) {
    console.error("createAgreementPacket:", error);
    return { error: "Failed to create agreement packet." };
  }
}

export async function updateAgreementPacketDraft(input: {
  packetId: string;
  data: Omit<z.infer<typeof packetFieldsSchema>, "clientId">;
}) {
  const session = await requireStaff("clients.manage");
  const loaded = await loadPacketOrError(input.packetId);
  if ("error" in loaded) {
    return loaded;
  }

  const { packet } = loaded;
  if (!canEditPacketDraft(packet.status)) {
    return {
      error:
        "This packet cannot be edited. Return it to draft or create a superseding packet.",
    };
  }

  const parsed = packetFieldsSchema.safeParse({
    clientId: packet.clientId,
    ...input.data,
  });
  if (!parsed.success) {
    return { error: "Invalid agreement packet fields." };
  }

  try {
    await prisma.agreementPacket.update({
      where: { id: packet.id },
      data: {
        clientServicesTemplateId: parsed.data.clientServicesTemplateId,
        workAuthorizationTemplateId: parsed.data.workAuthorizationTemplateId,
        companyLegalName: parsed.data.companyLegalName.trim(),
        companyDba: parsed.data.companyDba?.trim() || null,
        companyAddress: parsed.data.companyAddress?.trim() || null,
        signerName: parsed.data.signerName.trim(),
        signerTitle: parsed.data.signerTitle.trim(),
        signerEmail: parsed.data.signerEmail.trim().toLowerCase(),
        serviceType: parsed.data.serviceType,
        selectedScopeJson: parsed.data.selectedScopeJson as SupportBlockScope | RequestBasedScope | CustomScope,
        pricingJson: (parsed.data.pricingJson ?? undefined) as
          | Prisma.InputJsonValue
          | undefined,
        billingJson: (parsed.data.billingJson ?? undefined) as
          | Prisma.InputJsonValue
          | undefined,
      },
    });

    await writeAgreementPacketEvent({
      agreementPacketId: packet.id,
      eventType: AGREEMENT_EVENT_TYPES.UPDATED,
      actorUserId: session.user.id,
      actorEmail: session.user.email ?? null,
    });

    revalidateAgreementSurfaces(packet.clientId, packet.id);
    return { success: true };
  } catch (error) {
    console.error("updateAgreementPacketDraft:", error);
    return { error: "Failed to update agreement packet." };
  }
}

export async function generateAgreementPacket(packetId: string) {
  const session = await requireStaff("clients.manage");
  const loaded = await loadPacketOrError(packetId);
  if ("error" in loaded) {
    return loaded;
  }

  const { packet } = loaded;
  if (!canGeneratePacket(packet.status)) {
    return { error: "Only draft packets can be generated." };
  }

  const snapshot = buildPacketSnapshot({
    id: packet.id,
    companyLegalName: packet.companyLegalName,
    companyDba: packet.companyDba,
    companyAddress: packet.companyAddress,
    signerName: packet.signerName,
    signerTitle: packet.signerTitle,
    signerEmail: packet.signerEmail,
    serviceType: packet.serviceType,
    selectedScopeJson: packet.selectedScopeJson,
    pricingJson: packet.pricingJson,
    billingJson: packet.billingJson,
    clientServicesTemplate: packet.clientServicesTemplate,
    workAuthorizationTemplate: packet.workAuthorizationTemplate,
  });

  try {
    const { fileId, sha256Hash } = await storeAgreementPdf({
      packetId: packet.id,
      snapshot,
      variant: "unsigned",
    });

    const now = new Date();
    await prisma.agreementPacket.update({
      where: { id: packet.id },
      data: {
        status: AgreementPacketStatus.READY,
        acceptanceSnapshotJson: snapshot,
        snapshotAt: now,
        unsignedPdfFileId: fileId,
      },
    });

    await writeAgreementPacketEvent({
      agreementPacketId: packet.id,
      eventType: AGREEMENT_EVENT_TYPES.SNAPSHOT_CREATED,
      actorUserId: session.user.id,
      actorEmail: session.user.email ?? null,
      metadata: { snapshotAt: now.toISOString() },
    });

    await writeAgreementPacketEvent({
      agreementPacketId: packet.id,
      eventType: AGREEMENT_EVENT_TYPES.PDF_GENERATED,
      actorUserId: session.user.id,
      actorEmail: session.user.email ?? null,
      metadata: { variant: "unsigned", sha256Hash, fileId },
    });

    await writeAuditLog({
      actorUserId: session.user.id,
      action: "agreement_packet.generated",
      entityType: "AgreementPacket",
      entityId: packet.id,
      metadata: { sha256Hash },
    });

    revalidateAgreementSurfaces(packet.clientId, packet.id);
    return { success: true };
  } catch (error) {
    console.error("generateAgreementPacket:", error);
    return { error: getPrivateBlobErrorMessage(error) };
  }
}

export async function returnAgreementPacketToDraft(input: {
  packetId: string;
  reason: string;
}) {
  const session = await requireStaff("clients.manage");
  const reason = input.reason?.trim();
  if (!reason) {
    return { error: "A reason is required to return this packet to draft." };
  }

  const loaded = await loadPacketOrError(input.packetId);
  if ("error" in loaded) {
    return loaded;
  }

  const { packet } = loaded;
  if (!canReturnToDraft(packet.status)) {
    return { error: "This packet cannot be returned to draft." };
  }
  if (isPacketImmutable(packet.status)) {
    return { error: "This packet is immutable." };
  }

  try {
    await prisma.agreementPacket.update({
      where: { id: packet.id },
      data: {
        status: AgreementPacketStatus.DRAFT,
        acceptanceSnapshotJson: Prisma.JsonNull,
        snapshotAt: null,
        unsignedPdfFileId: null,
        sentAt: null,
      },
    });

    await writeAgreementPacketEvent({
      agreementPacketId: packet.id,
      eventType: AGREEMENT_EVENT_TYPES.RETURNED_TO_DRAFT,
      actorUserId: session.user.id,
      actorEmail: session.user.email ?? null,
      metadata: { reason },
    });

    revalidateAgreementSurfaces(packet.clientId, packet.id);
    return { success: true };
  } catch (error) {
    console.error("returnAgreementPacketToDraft:", error);
    return { error: "Failed to return packet to draft." };
  }
}

export async function markAgreementPacketSentManually(input: {
  packetId: string;
  note: string;
}) {
  const session = await requireStaff("clients.manage");
  const note = input.note?.trim();
  if (!note) {
    return {
      error:
        "A note is required explaining how this packet was sent outside the app.",
    };
  }

  const loaded = await loadPacketOrError(input.packetId);
  if ("error" in loaded) {
    return loaded;
  }

  const { packet } = loaded;
  if (!canMarkSentManually(packet.status)) {
    return { error: "Only ready packets can be marked as sent manually." };
  }
  if (!packet.acceptanceSnapshotJson) {
    return { error: "Generate the packet before marking it as sent." };
  }

  const now = new Date();
  try {
    await prisma.agreementPacket.update({
      where: { id: packet.id },
      data: {
        status: AgreementPacketStatus.SENT,
        sentAt: now,
      },
    });

    await writeAgreementPacketEvent({
      agreementPacketId: packet.id,
      eventType: AGREEMENT_EVENT_TYPES.SENT_MANUALLY,
      actorUserId: session.user.id,
      actorEmail: session.user.email ?? null,
      metadata: {
        label: "Sent Manually / Outside App",
        note,
        deliveryVerified: false,
      },
    });

    await writeAuditLog({
      actorUserId: session.user.id,
      action: "agreement_packet.sent_manually",
      entityType: "AgreementPacket",
      entityId: packet.id,
      metadata: { note, deliveryVerified: false },
    });

    revalidateAgreementSurfaces(packet.clientId, packet.id);
    return { success: true };
  } catch (error) {
    console.error("markAgreementPacketSentManually:", error);
    return { error: "Failed to mark packet as sent." };
  }
}

export async function voidAgreementPacket(input: {
  packetId: string;
  reason: string;
}) {
  const session = await requireStaff("clients.manage");
  const reason = input.reason?.trim();
  if (!reason) {
    return { error: "A reason is required to void this packet." };
  }

  const loaded = await loadPacketOrError(input.packetId);
  if ("error" in loaded) {
    return loaded;
  }

  const { packet } = loaded;
  if (!canVoidPacket(packet.status)) {
    return { error: "This packet cannot be voided." };
  }

  try {
    await prisma.agreementPacket.update({
      where: { id: packet.id },
      data: {
        status: AgreementPacketStatus.VOIDED,
        voidedAt: new Date(),
      },
    });

    await writeAgreementPacketEvent({
      agreementPacketId: packet.id,
      eventType: AGREEMENT_EVENT_TYPES.VOIDED,
      actorUserId: session.user.id,
      actorEmail: session.user.email ?? null,
      metadata: { reason },
    });

    revalidateAgreementSurfaces(packet.clientId, packet.id);
    return { success: true };
  } catch (error) {
    console.error("voidAgreementPacket:", error);
    return { error: "Failed to void agreement packet." };
  }
}

export async function supersedeAgreementPacket(input: {
  packetId: string;
  reason?: string;
}) {
  const session = await requireStaff("clients.manage");
  const loaded = await loadPacketOrError(input.packetId);
  if ("error" in loaded) {
    return loaded;
  }

  const { packet } = loaded;
  if (!canSupersedePacket(packet.status)) {
    return { error: "This packet cannot be superseded." };
  }

  try {
    const replacement = await prisma.$transaction(async (tx) => {
      const created = await tx.agreementPacket.create({
        data: {
          clientId: packet.clientId,
          status: AgreementPacketStatus.DRAFT,
          clientServicesTemplateId: packet.clientServicesTemplateId,
          workAuthorizationTemplateId: packet.workAuthorizationTemplateId,
          companyLegalName: packet.companyLegalName,
          companyDba: packet.companyDba,
          companyAddress: packet.companyAddress,
          signerName: packet.signerName,
          signerTitle: packet.signerTitle,
          signerEmail: packet.signerEmail,
          serviceType: packet.serviceType,
          selectedScopeJson: packet.selectedScopeJson ?? undefined,
          pricingJson: packet.pricingJson ?? undefined,
          billingJson: packet.billingJson ?? undefined,
          createdByUserId: session.user.id!,
        },
      });

      await tx.agreementPacket.update({
        where: { id: packet.id },
        data: {
          status: AgreementPacketStatus.SUPERSEDED,
          supersededById: created.id,
        },
      });

      return created;
    });

    await writeAgreementPacketEvent({
      agreementPacketId: packet.id,
      eventType: AGREEMENT_EVENT_TYPES.SUPERSEDED,
      actorUserId: session.user.id,
      actorEmail: session.user.email ?? null,
      metadata: {
        reason: input.reason?.trim() || null,
        supersededById: replacement.id,
      },
    });

    await writeAgreementPacketEvent({
      agreementPacketId: replacement.id,
      eventType: AGREEMENT_EVENT_TYPES.CREATED,
      actorUserId: session.user.id,
      actorEmail: session.user.email ?? null,
      metadata: { supersededFromId: packet.id },
    });

    revalidateAgreementSurfaces(packet.clientId, packet.id);
    revalidatePath(`/admin/agreements/${replacement.id}`);
    return { success: true, packetId: replacement.id };
  } catch (error) {
    console.error("supersedeAgreementPacket:", error);
    return { error: "Failed to supersede agreement packet." };
  }
}

export async function getAgreementPacketPreviewSnapshot(packetId: string) {
  await requireStaff("clients.manage");
  const loaded = await loadPacketOrError(packetId);
  if ("error" in loaded) {
    return loaded;
  }

  const { packet } = loaded;

  if (packet.acceptanceSnapshotJson) {
    const stored = parseStoredSnapshot(packet.acceptanceSnapshotJson);
    if (stored) {
      return { snapshot: stored, source: "frozen" as const };
    }
  }

  if (packet.status !== AgreementPacketStatus.DRAFT) {
    return { error: "Frozen snapshot is missing for this packet." };
  }

  const snapshot = buildPacketSnapshot({
    id: packet.id,
    companyLegalName: packet.companyLegalName,
    companyDba: packet.companyDba,
    companyAddress: packet.companyAddress,
    signerName: packet.signerName,
    signerTitle: packet.signerTitle,
    signerEmail: packet.signerEmail,
    serviceType: packet.serviceType,
    selectedScopeJson: packet.selectedScopeJson,
    pricingJson: packet.pricingJson,
    billingJson: packet.billingJson,
    clientServicesTemplate: packet.clientServicesTemplate,
    workAuthorizationTemplate: packet.workAuthorizationTemplate,
  });

  return { snapshot, source: "live" as const };
}

export async function getClientAgreementAutofill(clientId: string) {
  await requireStaff("clients.manage");
  const client = await prisma.client.findUnique({
    where: { id: clientId },
    select: {
      id: true,
      companyName: true,
      contactName: true,
      email: true,
      role: true,
      engagementType: true,
      planType: true,
      weeklyHours: true,
    },
  });
  if (!client) {
    return { error: "Client not found." };
  }

  const templates = await getDefaultTemplatePair();

  return {
    client,
    templates: {
      csa: templates.csa,
      workAuth: templates.workAuth,
    },
    defaults: {
      companyLegalName: client.companyName,
      signerName: client.contactName,
      signerTitle: client.role || "Authorized Representative",
      signerEmail: client.email,
    },
  };
}
