import "server-only";

import {
  DiscoveryAppointmentStatus,
  DiscoverySchedulingLinkStatus,
} from "@/generated/prisma/client";
import { writeAuditLog } from "@/lib/audit-log";
import { decryptFieldValue, encryptFieldValue } from "@/lib/crypto/field-encryption";
import { sendDiscoverySchedulingLinkEmail } from "@/lib/email";
import { prisma } from "@/lib/prisma";
import { revalidateAdminClientPage } from "@/lib/revalidate-paths";
import { getDiscoverySchedulingReadiness } from "@/lib/discovery-scheduling/scheduling-readiness";
import {
  buildSchedulingLinkExpiry,
  buildDiscoverySchedulingUrl,
  createSchedulingRawToken,
  hashSchedulingToken,
} from "@/lib/discovery-scheduling/tokens";

export type EnsureDiscoverySchedulingLinkInput = {
  supportRequestId: string;
  regenerate?: boolean;
  sendSchedulingEmail?: boolean;
  createdByUserId?: string | null;
  audit?: {
    actorUserId?: string | null;
    action: string;
  };
  /** When true (default), return error if an ACTIVE link already exists and regenerate is false. */
  errorIfActiveExists?: boolean;
};

export type EnsureDiscoverySchedulingLinkResult =
  | { schedulingUrl: string; warning?: string }
  | { error: string };

async function getIntakeRequestForLink(supportRequestId: string) {
  return prisma.supportRequest.findFirst({
    where: { id: supportRequestId, kind: "PROSPECT_INTAKE" },
    include: { client: true },
  });
}

export async function ensureDiscoverySchedulingLink(
  input: EnsureDiscoverySchedulingLinkInput,
): Promise<EnsureDiscoverySchedulingLinkResult> {
  const {
    supportRequestId,
    regenerate = false,
    sendSchedulingEmail = false,
    createdByUserId = null,
    audit,
    errorIfActiveExists = true,
  } = input;

  const readiness = await getDiscoverySchedulingReadiness();
  if (!readiness.ready) {
    return { error: readiness.blockers[0] ?? "Scheduling is not ready." };
  }

  const request = await getIntakeRequestForLink(supportRequestId);
  if (!request) {
    return { error: "Discovery request not found." };
  }

  if (!request.client.email?.trim()) {
    return { error: "Prospect email is missing." };
  }

  if (regenerate) {
    await prisma.discoverySchedulingLink.updateMany({
      where: {
        supportRequestId: request.id,
        status: DiscoverySchedulingLinkStatus.ACTIVE,
      },
      data: {
        status: DiscoverySchedulingLinkStatus.REVOKED,
        revokedAt: new Date(),
      },
    });
  }

  const existing = await prisma.discoverySchedulingLink.findUnique({
    where: { supportRequestId: request.id },
    include: { appointment: true },
  });

  if (existing && existing.status === DiscoverySchedulingLinkStatus.ACTIVE && !regenerate) {
    if (errorIfActiveExists) {
      return { error: "An active scheduling link already exists. Resend or regenerate it." };
    }
    const rawToken = decryptFieldValue(existing.encryptedToken);
    if (!rawToken) {
      return { error: "Link URL unavailable. Regenerate the link." };
    }
    return { schedulingUrl: buildDiscoverySchedulingUrl(rawToken) };
  }

  if (
    existing?.status === DiscoverySchedulingLinkStatus.USED &&
    existing.appointment &&
    existing.appointment.status !== DiscoveryAppointmentStatus.CANCELED
  ) {
    return {
      error: regenerate
        ? "Cannot regenerate this link while a discovery is still scheduled. Cancel the appointment first."
        : "An appointment is already booked for this request. Cancel it to create a new link.",
    };
  }

  const rawToken = createSchedulingRawToken();
  const linkData = {
    tokenHash: hashSchedulingToken(rawToken),
    encryptedToken: encryptFieldValue(rawToken),
    status: DiscoverySchedulingLinkStatus.ACTIVE,
    expiresAt: buildSchedulingLinkExpiry(),
    revokedAt: null,
    createdByUserId,
  };

  const link = existing
    ? await prisma.discoverySchedulingLink.update({
        where: { id: existing.id },
        data: linkData,
      })
    : await prisma.discoverySchedulingLink.create({
        data: {
          ...linkData,
          clientId: request.clientId,
          supportRequestId: request.id,
        },
      });

  const schedulingUrl = buildDiscoverySchedulingUrl(rawToken);

  let warning: string | undefined;
  if (sendSchedulingEmail) {
    const emailResult = await sendDiscoverySchedulingLinkEmail({
      to: request.client.email,
      contactName: request.client.contactName,
      companyName: request.client.companyName,
      schedulingUrl,
    });

    await prisma.discoverySchedulingLink.update({
      where: { id: link.id },
      data: { sentAt: new Date() },
    });

    if ("error" in emailResult && emailResult.error) {
      warning = emailResult.error;
    }
  }

  if (audit) {
    await writeAuditLog({
      actorUserId: audit.actorUserId ?? null,
      action: audit.action,
      entityType: "DiscoverySchedulingLink",
      entityId: link.id,
      metadata: { clientId: request.clientId },
    });
  }

  revalidateAdminClientPage(request.clientId);

  return warning ? { schedulingUrl, warning } : { schedulingUrl };
}
