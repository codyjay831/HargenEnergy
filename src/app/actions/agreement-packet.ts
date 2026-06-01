"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import {
  AgreementSigningLinkStatus,
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
import {
  storeAgreementPdf,
  storeUploadedAgreementPdf,
} from "@/lib/agreements/storage";
import {
  canCreateSigningLink,
  canEditPacketDraft,
  canGeneratePacket,
  canMarkManuallySigned,
  canMarkSentManually,
  canReturnToDraftWithGuards,
  canSupersedePacket,
  canVoidPacket,
  isPacketImmutable,
} from "@/lib/agreements/status";
import { createAgreementSigningLink } from "@/lib/agreements/signing-links";
import { acceptanceKindForIndex } from "@/lib/agreements/acceptance-records";
import { getPrivateBlobErrorMessage } from "@/lib/agreements/blob-guard";
import { getDefaultTemplatePair } from "@/lib/agreements/ensure-templates";
import { decryptFieldValue } from "@/lib/crypto/field-encryption";
import { sendAgreementSigningLinkEmail } from "@/lib/email";
import {
  buildAgreementSigningUrl,
  isSigningLinkExpired,
} from "@/lib/agreements/tokens";
import {
  buildPersistenceFailureMessage,
  buildProviderFailureMessage,
  decideSigningEmailDispatch,
} from "@/lib/agreements/signing-email-delivery";
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
  if (isPacketImmutable(packet.status)) {
    return { error: "This packet is immutable." };
  }

  const [acceptanceCount, usedLinkCount] = await Promise.all([
    prisma.agreementPacketAcceptance.count({
      where: { agreementPacketId: packet.id },
    }),
    prisma.agreementSigningLink.count({
      where: {
        agreementPacketId: packet.id,
        status: AgreementSigningLinkStatus.USED,
      },
    }),
  ]);

  const hasViewed =
    packet.status === AgreementPacketStatus.VIEWED || Boolean(packet.viewedAt);

  if (
    !canReturnToDraftWithGuards({
      status: packet.status,
      hasViewed,
      hasUsedSigningLink: usedLinkCount > 0,
      hasAcceptances: acceptanceCount > 0,
    })
  ) {
    return {
      error:
        "This packet cannot be returned to draft after it has been viewed, signed, or had acceptances recorded.",
    };
  }

  try {
    const now = new Date();
    await prisma.$transaction([
      prisma.agreementSigningLink.updateMany({
        where: {
          agreementPacketId: packet.id,
          status: AgreementSigningLinkStatus.ACTIVE,
        },
        data: {
          status: AgreementSigningLinkStatus.REVOKED,
          revokedAt: now,
        },
      }),
      prisma.agreementPacket.update({
        where: { id: packet.id },
        data: {
          status: AgreementPacketStatus.DRAFT,
          acceptanceSnapshotJson: Prisma.JsonNull,
          snapshotAt: null,
          unsignedPdfFileId: null,
          signedPdfFileId: null,
          sentAt: null,
          viewedAt: null,
          signedAt: null,
        },
      }),
    ]);

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

export async function createAgreementPacketSigningLink(input: {
  packetId: string;
  regenerate?: boolean;
}) {
  const session = await requireStaff("clients.manage");

  const loaded = await loadPacketOrError(input.packetId);
  if ("error" in loaded) {
    return { error: loaded.error };
  }

  const { packet } = loaded;
  if (!canCreateSigningLink(packet.status)) {
    return { error: "A signing link cannot be created for this packet status." };
  }

  const result = await createAgreementSigningLink({
    agreementPacketId: packet.id,
    createdByUserId: session.user.id,
    regenerate: input.regenerate ?? false,
  });

  if ("error" in result) {
    return { error: result.error };
  }

  await writeAuditLog({
    actorUserId: session.user.id,
    action: "agreement_packet.signing_link_created",
    entityType: "AgreementPacket",
    entityId: packet.id,
    metadata: { linkId: result.linkId, regenerate: Boolean(input.regenerate) },
  });

  revalidateAgreementSurfaces(packet.clientId, packet.id);
  return {
    success: true,
    signingUrl: result.signingUrl,
    linkId: result.linkId,
    expiresAt: result.expiresAt.toISOString(),
  };
}

type SigningEmailFailureType = "provider" | "persistence";

type AgreementSigningEmailResult =
  | {
      success: true;
      signingUrl: string;
      linkId: string;
      expiresAt: string;
      warning?: string;
    }
  | {
      error: string;
      errorType?: SigningEmailFailureType;
      signingUrl?: string;
      linkId?: string;
      expiresAt?: string;
      warning?: string;
    };

async function persistAgreementSigningEmailDelivery(input: {
  packetId: string;
  packetStatus: AgreementPacketStatus;
  linkId: string;
  sentAt: Date;
  eventType: string;
  actorUserId?: string | null;
  actorEmail?: string | null;
  eventMetadata: Record<string, unknown>;
}): Promise<{ ok: true } | { ok: false; error: string }> {
  const metadata = input.eventMetadata as Prisma.InputJsonValue;
  try {
    await prisma.$transaction(async (tx) => {
      await tx.agreementSigningLink.update({
        where: { id: input.linkId },
        data: { sentAt: input.sentAt },
      });

      if (input.packetStatus === AgreementPacketStatus.READY) {
        await tx.agreementPacket.update({
          where: { id: input.packetId },
          data: { status: AgreementPacketStatus.SENT, sentAt: input.sentAt },
        });
      } else {
        await tx.agreementPacket.update({
          where: { id: input.packetId },
          data: { sentAt: input.sentAt },
        });
      }

      await tx.agreementPacketEvent.create({
        data: {
          agreementPacketId: input.packetId,
          eventType: input.eventType,
          actorUserId: input.actorUserId ?? null,
          actorEmail: input.actorEmail ?? null,
          metadataJson: metadata,
        },
      });
    });
    return { ok: true };
  } catch (error) {
    console.error("persistAgreementSigningEmailDelivery:", error);
    return {
      ok: false,
      error: buildPersistenceFailureMessage(),
    };
  }
}

export async function sendAgreementPacketSigningLinkEmail(input: {
  packetId: string;
  regenerate?: boolean;
}): Promise<AgreementSigningEmailResult> {
  const session = await requireStaff("clients.manage");

  const loaded = await loadPacketOrError(input.packetId);
  if ("error" in loaded) {
    return { error: "Agreement packet not found." };
  }

  const { packet } = loaded;
  if (!canCreateSigningLink(packet.status)) {
    return { error: "A signing link cannot be created for this packet status." };
  }
  if (!packet.signerEmail?.trim()) {
    return { error: "Signer email is required before sending." };
  }

  const result = await createAgreementSigningLink({
    agreementPacketId: packet.id,
    createdByUserId: session.user.id,
    regenerate: input.regenerate ?? false,
  });

  if ("error" in result) {
    return { error: result.error };
  }

  const sentAt = new Date();
  const emailResult = await sendAgreementSigningLinkEmail({
    to: packet.signerEmail,
    signerName: packet.signerName,
    companyName: packet.companyLegalName,
    signingUrl: result.signingUrl,
    expiresAt: result.expiresAt,
    replyTo: session.user.email ?? null,
  });
  if ("error" in emailResult) {
    return {
      error: buildProviderFailureMessage(
        emailResult.error ?? "Failed to send agreement signing email.",
      ),
      errorType: "provider",
      signingUrl: result.signingUrl,
      linkId: result.linkId,
      expiresAt: result.expiresAt.toISOString(),
    };
  }

  const persisted = await persistAgreementSigningEmailDelivery({
    packetId: packet.id,
    packetStatus: packet.status,
    linkId: result.linkId,
    sentAt,
    eventType: AGREEMENT_EVENT_TYPES.SENT_VIA_EMAIL,
    actorUserId: session.user.id,
    actorEmail: session.user.email ?? null,
    eventMetadata: {
      label: "Sent via app email",
      to: packet.signerEmail,
      linkId: result.linkId,
      messageId: emailResult.messageId,
      deliveryVerified: true,
      regenerate: Boolean(input.regenerate),
    },
  });
  if (!persisted.ok) {
    return {
      error: persisted.error,
      errorType: "persistence",
      warning: persisted.error,
      signingUrl: result.signingUrl,
      linkId: result.linkId,
      expiresAt: result.expiresAt.toISOString(),
    };
  }

  await writeAuditLog({
    actorUserId: session.user.id,
    action: input.regenerate
      ? "agreement_packet.signing_link_regenerated_and_sent"
      : "agreement_packet.signing_link_sent",
    entityType: "AgreementPacket",
    entityId: packet.id,
    metadata: { linkId: result.linkId, to: packet.signerEmail },
  });

  revalidateAgreementSurfaces(packet.clientId, packet.id);
  return {
    success: true,
    signingUrl: result.signingUrl,
    linkId: result.linkId,
    expiresAt: result.expiresAt.toISOString(),
  };
}

export async function resendAgreementPacketSigningLinkEmail(input: {
  packetId: string;
}): Promise<AgreementSigningEmailResult> {
  const session = await requireStaff("clients.manage");

  const loaded = await loadPacketOrError(input.packetId);
  if ("error" in loaded) {
    return { error: "Agreement packet not found." };
  }

  const { packet } = loaded;
  if (!canCreateSigningLink(packet.status)) {
    return { error: "This packet cannot resend signing email in its current status." };
  }
  if (!packet.signerEmail?.trim()) {
    return { error: "Signer email is required before resending." };
  }

  const link = await prisma.agreementSigningLink.findFirst({
    where: {
      agreementPacketId: packet.id,
      status: AgreementSigningLinkStatus.ACTIVE,
    },
    orderBy: { createdAt: "desc" },
  });
  if (!link) {
    return { error: "No active signing link exists. Create and send one first." };
  }
  if (isSigningLinkExpired(link.expiresAt)) {
    await prisma.agreementSigningLink.update({
      where: { id: link.id },
      data: { status: AgreementSigningLinkStatus.EXPIRED },
    });
    await writeAgreementPacketEvent({
      agreementPacketId: packet.id,
      eventType: AGREEMENT_EVENT_TYPES.SIGNING_LINK_EXPIRED,
      actorUserId: session.user.id,
      actorEmail: session.user.email ?? null,
      metadata: { linkId: link.id },
    });
    return { error: "This signing link has expired. Regenerate and send a new link." };
  }

  const rawToken = decryptFieldValue(link.encryptedToken);
  if (!rawToken) {
    return { error: "Active link URL is unavailable. Regenerate and send a new link." };
  }

  const signingUrl = buildAgreementSigningUrl(rawToken);
  const sentAt = new Date();
  const emailResult = await sendAgreementSigningLinkEmail({
    to: packet.signerEmail,
    signerName: packet.signerName,
    companyName: packet.companyLegalName,
    signingUrl,
    expiresAt: link.expiresAt,
    replyTo: session.user.email ?? null,
  });
  if ("error" in emailResult) {
    return {
      error: buildProviderFailureMessage(
        emailResult.error ?? "Failed to send agreement signing email.",
      ),
      errorType: "provider",
      signingUrl,
      linkId: link.id,
      expiresAt: link.expiresAt.toISOString(),
    };
  }

  const dispatch = decideSigningEmailDispatch({
    resendAttempt: true,
    hadPriorSentAt: Boolean(link.sentAt),
  });
  const eventType =
    dispatch.eventType === "signing_link.email_resent"
      ? AGREEMENT_EVENT_TYPES.SIGNING_LINK_EMAIL_RESENT
      : AGREEMENT_EVENT_TYPES.SENT_VIA_EMAIL;
  const persisted = await persistAgreementSigningEmailDelivery({
    packetId: packet.id,
    packetStatus: packet.status,
    linkId: link.id,
    sentAt,
    eventType,
    actorUserId: session.user.id,
    actorEmail: session.user.email ?? null,
    eventMetadata: {
      label: dispatch.label,
      to: packet.signerEmail,
      linkId: link.id,
      messageId: emailResult.messageId,
      deliveryVerified: true,
      resend: dispatch.resend,
    },
  });
  if (!persisted.ok) {
    return {
      error: persisted.error,
      errorType: "persistence",
      warning: persisted.error,
      signingUrl,
      linkId: link.id,
      expiresAt: link.expiresAt.toISOString(),
    };
  }

  await writeAuditLog({
    actorUserId: session.user.id,
    action: dispatch.auditAction,
    entityType: "AgreementPacket",
    entityId: packet.id,
    metadata: { linkId: link.id, to: packet.signerEmail },
  });

  revalidateAgreementSurfaces(packet.clientId, packet.id);
  return {
    success: true,
    signingUrl,
    linkId: link.id,
    expiresAt: link.expiresAt.toISOString(),
  };
}

const MAX_MANUAL_SIGN_PDF_BYTES = 15 * 1024 * 1024;

export async function markAgreementPacketManuallySigned(formData: FormData) {
  const session = await requireStaff("clients.manage");

  const packetId = String(formData.get("packetId") ?? "").trim();
  const note = String(formData.get("note") ?? "").trim();
  const file = formData.get("pdf");

  if (!packetId) {
    return { error: "Packet ID is required." };
  }
  if (!note) {
    return { error: "A note is required describing how this was signed outside the app." };
  }
  if (!(file instanceof File) || file.size === 0) {
    return { error: "A signed PDF file is required." };
  }
  if (file.type !== "application/pdf") {
    return { error: "Only PDF files are accepted." };
  }
  if (file.size > MAX_MANUAL_SIGN_PDF_BYTES) {
    return { error: "Signed PDF must be 15 MB or smaller." };
  }

  const loaded = await loadPacketOrError(packetId);
  if ("error" in loaded) {
    return loaded;
  }

  const { packet } = loaded;
  if (!canMarkManuallySigned(packet.status)) {
    return { error: "This packet cannot be marked as manually signed." };
  }

  const snapshot = parseStoredSnapshot(packet.acceptanceSnapshotJson);
  if (!snapshot) {
    return {
      error: "Generate the packet and freeze the legal snapshot before recording a manual signature.",
    };
  }

  const existingAcceptances = await prisma.agreementPacketAcceptance.count({
    where: { agreementPacketId: packet.id },
  });
  if (existingAcceptances > 0) {
    return { error: "Acceptances are already recorded for this packet." };
  }

  const signedAt = new Date();
  const acceptanceRows = snapshot.acceptanceBlocks.map((block, index) => ({
    acceptanceType: acceptanceKindForIndex(index),
    signerName: snapshot.signerName,
    signerTitle: snapshot.signerTitle,
    signerEmail: snapshot.signerEmail,
    checkboxText: block.checkboxText,
    signedAt,
    ipAddress: null,
    userAgent: null,
    source: "manual",
  }));

  try {
    const pdfBuffer = Buffer.from(await file.arrayBuffer());

    await prisma.$transaction(async (tx) => {
      for (const row of acceptanceRows) {
        await tx.agreementPacketAcceptance.create({
          data: {
            agreementPacketId: packet.id,
            ...row,
          },
        });
      }

      await tx.agreementSigningLink.updateMany({
        where: {
          agreementPacketId: packet.id,
          status: AgreementSigningLinkStatus.ACTIVE,
        },
        data: {
          status: AgreementSigningLinkStatus.REVOKED,
          revokedAt: signedAt,
        },
      });

      await tx.agreementPacket.update({
        where: { id: packet.id },
        data: {
          status: AgreementPacketStatus.SIGNED,
          signedAt,
          viewedAt: packet.viewedAt ?? signedAt,
        },
      });
    });

    const { fileId, sha256Hash } = await storeUploadedAgreementPdf({
      packetId: packet.id,
      pdfBuffer,
      fileLabel: file.name || `agreement-packet-${packet.id}-signed.pdf`,
    });

    await prisma.agreementPacket.update({
      where: { id: packet.id },
      data: { signedPdfFileId: fileId },
    });

    await writeAgreementPacketEvent({
      agreementPacketId: packet.id,
      eventType: AGREEMENT_EVENT_TYPES.MANUALLY_SIGNED,
      actorUserId: session.user.id,
      actorEmail: session.user.email ?? null,
      metadata: { note, deliveryVerified: false, sha256Hash, fileId },
    });

    await writeAgreementPacketEvent({
      agreementPacketId: packet.id,
      eventType: AGREEMENT_EVENT_TYPES.SIGNED,
      actorUserId: session.user.id,
      actorEmail: session.user.email ?? null,
      metadata: { source: "manual", sha256Hash },
    });

    await writeAuditLog({
      actorUserId: session.user.id,
      action: "agreement_packet.signed_manually",
      entityType: "AgreementPacket",
      entityId: packet.id,
      metadata: { sha256Hash },
    });

    revalidateAgreementSurfaces(packet.clientId, packet.id);
    return { success: true };
  } catch (error) {
    console.error("markAgreementPacketManuallySigned:", error);
    return { error: getPrivateBlobErrorMessage(error) };
  }
}
