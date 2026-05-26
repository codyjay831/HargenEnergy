import "server-only";

import {
  WalkthroughAppointmentStatus,
  WalkthroughSchedulingLinkStatus,
} from "@/generated/prisma/client";
import { writeAuditLog } from "@/lib/audit-log";
import { decryptFieldValue, encryptFieldValue } from "@/lib/crypto/field-encryption";
import { sendWalkthroughSchedulingLinkEmail } from "@/lib/email";
import { prisma } from "@/lib/prisma";
import { revalidateAdminClientPage } from "@/lib/revalidate-paths";
import { getWalkthroughSchedulingReadiness } from "@/lib/walkthrough-scheduling/scheduling-readiness";
import {
  buildSchedulingLinkExpiry,
  buildWalkthroughSchedulingUrl,
  createSchedulingRawToken,
  hashSchedulingToken,
} from "@/lib/walkthrough-scheduling/tokens";

export type EnsureWalkthroughSchedulingLinkInput = {
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

export type EnsureWalkthroughSchedulingLinkResult =
  | { schedulingUrl: string; warning?: string }
  | { error: string };

async function getIntakeRequestForLink(supportRequestId: string) {
  return prisma.supportRequest.findFirst({
    where: { id: supportRequestId, kind: "PROSPECT_INTAKE" },
    include: { client: true },
  });
}

export async function ensureWalkthroughSchedulingLink(
  input: EnsureWalkthroughSchedulingLinkInput,
): Promise<EnsureWalkthroughSchedulingLinkResult> {
  const {
    supportRequestId,
    regenerate = false,
    sendSchedulingEmail = false,
    createdByUserId = null,
    audit,
    errorIfActiveExists = true,
  } = input;

  const readiness = await getWalkthroughSchedulingReadiness();
  if (!readiness.ready) {
    return { error: readiness.blockers[0] ?? "Scheduling is not ready." };
  }

  const request = await getIntakeRequestForLink(supportRequestId);
  if (!request) {
    return { error: "Walkthrough request not found." };
  }

  if (!request.client.email?.trim()) {
    return { error: "Prospect email is missing." };
  }

  if (regenerate) {
    await prisma.walkthroughSchedulingLink.updateMany({
      where: {
        supportRequestId: request.id,
        status: WalkthroughSchedulingLinkStatus.ACTIVE,
      },
      data: {
        status: WalkthroughSchedulingLinkStatus.REVOKED,
        revokedAt: new Date(),
      },
    });
  }

  const existing = await prisma.walkthroughSchedulingLink.findUnique({
    where: { supportRequestId: request.id },
    include: { appointment: true },
  });

  if (existing && existing.status === WalkthroughSchedulingLinkStatus.ACTIVE && !regenerate) {
    if (errorIfActiveExists) {
      return { error: "An active scheduling link already exists. Resend or regenerate it." };
    }
    const rawToken = decryptFieldValue(existing.encryptedToken);
    if (!rawToken) {
      return { error: "Link URL unavailable. Regenerate the link." };
    }
    return { schedulingUrl: buildWalkthroughSchedulingUrl(rawToken) };
  }

  if (
    regenerate &&
    existing?.status === WalkthroughSchedulingLinkStatus.USED &&
    existing.appointment &&
    existing.appointment.status !== WalkthroughAppointmentStatus.CANCELED
  ) {
    return {
      error:
        "Cannot regenerate this link while a walkthrough is still scheduled. Cancel the appointment first.",
    };
  }

  const rawToken = createSchedulingRawToken();
  const linkData = {
    tokenHash: hashSchedulingToken(rawToken),
    encryptedToken: encryptFieldValue(rawToken),
    status: WalkthroughSchedulingLinkStatus.ACTIVE,
    expiresAt: buildSchedulingLinkExpiry(),
    revokedAt: null,
    createdByUserId,
  };

  const link =
    regenerate &&
    existing &&
    existing.status !== WalkthroughSchedulingLinkStatus.ACTIVE
      ? await prisma.walkthroughSchedulingLink.update({
          where: { id: existing.id },
          data: linkData,
        })
      : await prisma.walkthroughSchedulingLink.create({
          data: {
            ...linkData,
            clientId: request.clientId,
            supportRequestId: request.id,
          },
        });

  const schedulingUrl = buildWalkthroughSchedulingUrl(rawToken);

  let warning: string | undefined;
  if (sendSchedulingEmail) {
    const emailResult = await sendWalkthroughSchedulingLinkEmail({
      to: request.client.email,
      contactName: request.client.contactName,
      companyName: request.client.companyName,
      schedulingUrl,
    });

    await prisma.walkthroughSchedulingLink.update({
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
      entityType: "WalkthroughSchedulingLink",
      entityId: link.id,
      metadata: { clientId: request.clientId },
    });
  }

  revalidateAdminClientPage(request.clientId);

  return warning ? { schedulingUrl, warning } : { schedulingUrl };
}
