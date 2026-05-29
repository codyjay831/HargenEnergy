"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import {
  DisbursementPaymentMethod,
  DisbursementStatus,
} from "@/generated/prisma/client";
import {
  sendDisbursementApprovalRequestEmail,
  sendDisbursementStatusEmail,
  sendInternalDisbursementDecisionAlert,
} from "@/lib/email";
import { requireClientUser, requireStaff } from "@/lib/auth-guards";
import { writeAuditLog } from "@/lib/audit-log";
import { prisma } from "@/lib/prisma";

const createSchema = z.object({
  clientId: z.string().min(1).max(128),
  supportRequestId: z.string().min(1).max(128),
  vendor: z.string().trim().min(1).max(200),
  purpose: z.string().trim().min(1).max(2000),
  amountCents: z.number().int().min(1).max(100_000_000),
  currency: z.string().trim().min(3).max(3).default("USD"),
  paymentMethod: z.nativeEnum(DisbursementPaymentMethod),
});

const decisionSchema = z.object({
  disbursementId: z.string().min(1).max(128),
});

const markPaidSchema = z.object({
  disbursementId: z.string().min(1).max(128),
  receiptUrl: z.string().trim().max(2000).optional().nullable(),
  receiptNotes: z.string().trim().max(4000).optional().nullable(),
  status: z.enum([
    DisbursementStatus.PAID,
    DisbursementStatus.CLIENT_PAID_DIRECT,
  ]),
});

export async function createDisbursementRequest(
  data: z.infer<typeof createSchema>,
) {
  const session = await requireStaff("billing.manage");

  const parsed = createSchema.safeParse(data);
  if (!parsed.success) {
    return { error: "Invalid disbursement details." };
  }

  const request = await prisma.supportRequest.findUnique({
    where: { id: parsed.data.supportRequestId },
    include: { client: true },
  });

  if (!request || request.clientId !== parsed.data.clientId) {
    return { error: "Support request not found for this client." };
  }

  const disbursement = await prisma.disbursementRequest.create({
    data: {
      ...parsed.data,
      requestedById: session.user.id,
      status: DisbursementStatus.PENDING_APPROVAL,
    },
  });

  try {
    await sendDisbursementApprovalRequestEmail({
      to: request.client.email,
      companyName: request.client.companyName,
      requestTitle: request.title,
      requestId: request.id,
      vendor: disbursement.vendor,
      purpose: disbursement.purpose,
      amountCents: disbursement.amountCents,
      currency: disbursement.currency,
      logoUrl: request.client.logoUrl,
      clientId: request.clientId,
    });
  } catch (emailError) {
    console.error("Failed to send disbursement approval email:", emailError);
    // Continue - disbursement was created successfully
  }

  revalidatePath(`/admin/requests/${request.id}`);
  revalidatePath(`/portal/requests/${request.id}`);
  return { success: true, id: disbursement.id };
}

export async function approveDisbursementRequest(disbursementId: string) {
  const session = await requireClientUser("disbursement.approve");

  const parsed = decisionSchema.safeParse({ disbursementId });
  if (!parsed.success) {
    return { error: "Invalid disbursement." };
  }

  const disbursement = await prisma.disbursementRequest.findUnique({
    where: { id: parsed.data.disbursementId },
    include: {
      supportRequest: true,
      client: true,
    },
  });

  if (!disbursement || disbursement.clientId !== session.user.clientId) {
    return { error: "Disbursement not found." };
  }

  if (disbursement.status !== DisbursementStatus.PENDING_APPROVAL) {
    return { error: "This disbursement is no longer awaiting approval." };
  }

  const result = await prisma.disbursementRequest.updateMany({
    where: { 
      id: disbursement.id,
      status: DisbursementStatus.PENDING_APPROVAL,
    },
    data: {
      status: DisbursementStatus.APPROVED,
      approvedAt: new Date(),
      approvedById: session.user.id,
    },
  });

  if (result.count === 0) {
    return { error: "This disbursement was already processed by another request." };
  }

  await sendInternalDisbursementDecisionAlert({
    companyName: disbursement.client.companyName,
    requestTitle: disbursement.supportRequest.title,
    requestId: disbursement.supportRequestId,
    vendor: disbursement.vendor,
    amountCents: disbursement.amountCents,
    currency: disbursement.currency,
    status: DisbursementStatus.APPROVED,
  });

  revalidatePath(`/portal/requests/${disbursement.supportRequestId}`);
  revalidatePath(`/admin/requests/${disbursement.supportRequestId}`);
  await writeAuditLog({
    actorUserId: session.user.id,
    action: "disbursement.approve",
    entityType: "DisbursementRequest",
    entityId: disbursement.id,
    metadata: {
      supportRequestId: disbursement.supportRequestId,
      status: DisbursementStatus.APPROVED,
    },
  });
  return { success: true };
}

export async function declineDisbursementRequest(disbursementId: string) {
  const session = await requireClientUser("disbursement.approve");

  const parsed = decisionSchema.safeParse({ disbursementId });
  if (!parsed.success) {
    return { error: "Invalid disbursement." };
  }

  const disbursement = await prisma.disbursementRequest.findUnique({
    where: { id: parsed.data.disbursementId },
    include: {
      supportRequest: true,
      client: true,
    },
  });

  if (!disbursement || disbursement.clientId !== session.user.clientId) {
    return { error: "Disbursement not found." };
  }

  if (disbursement.status !== DisbursementStatus.PENDING_APPROVAL) {
    return { error: "This disbursement is no longer awaiting approval." };
  }

  const result = await prisma.disbursementRequest.updateMany({
    where: { 
      id: disbursement.id,
      status: DisbursementStatus.PENDING_APPROVAL,
    },
    data: {
      status: DisbursementStatus.DECLINED,
      declinedAt: new Date(),
      approvedById: session.user.id,
    },
  });

  if (result.count === 0) {
    return { error: "This disbursement was already processed by another request." };
  }

  await sendInternalDisbursementDecisionAlert({
    companyName: disbursement.client.companyName,
    requestTitle: disbursement.supportRequest.title,
    requestId: disbursement.supportRequestId,
    vendor: disbursement.vendor,
    amountCents: disbursement.amountCents,
    currency: disbursement.currency,
    status: DisbursementStatus.DECLINED,
  });

  revalidatePath(`/portal/requests/${disbursement.supportRequestId}`);
  revalidatePath(`/admin/requests/${disbursement.supportRequestId}`);
  await writeAuditLog({
    actorUserId: session.user.id,
    action: "disbursement.decline",
    entityType: "DisbursementRequest",
    entityId: disbursement.id,
    metadata: {
      supportRequestId: disbursement.supportRequestId,
      status: DisbursementStatus.DECLINED,
    },
  });
  return { success: true };
}

export async function markDisbursementPaid(
  data: z.infer<typeof markPaidSchema>,
) {
  const session = await requireStaff("billing.manage");

  const parsed = markPaidSchema.safeParse(data);
  if (!parsed.success) {
    return { error: "Invalid payment details." };
  }

  const disbursement = await prisma.disbursementRequest.findUnique({
    where: { id: parsed.data.disbursementId },
    include: {
      supportRequest: true,
      client: true,
    },
  });

  if (!disbursement) {
    return { error: "Disbursement not found." };
  }

  if (parsed.data.status === DisbursementStatus.PAID) {
    if (disbursement.status !== DisbursementStatus.APPROVED) {
      return { error: "Only approved disbursements can be marked paid." };
    }
  } else if (
    disbursement.status !== DisbursementStatus.PENDING_APPROVAL &&
    disbursement.status !== DisbursementStatus.APPROVED
  ) {
    return { error: "This disbursement cannot be marked client-paid direct." };
  }

  await prisma.disbursementRequest.update({
    where: { id: disbursement.id },
    data: {
      status: parsed.data.status,
      paidAt: new Date(),
      receiptUrl: parsed.data.receiptUrl || null,
      receiptNotes: parsed.data.receiptNotes || null,
    },
  });

  await sendDisbursementStatusEmail({
    to: disbursement.client.email,
    companyName: disbursement.client.companyName,
    requestTitle: disbursement.supportRequest.title,
    requestId: disbursement.supportRequestId,
    status: parsed.data.status,
    vendor: disbursement.vendor,
    amountCents: disbursement.amountCents,
    currency: disbursement.currency,
    logoUrl: disbursement.client.logoUrl,
    receiptUrl: parsed.data.receiptUrl,
    clientId: disbursement.clientId,
  });

  revalidatePath(`/portal/requests/${disbursement.supportRequestId}`);
  revalidatePath(`/admin/requests/${disbursement.supportRequestId}`);
  await writeAuditLog({
    actorUserId: session.user.id,
    action: "disbursement.mark_paid",
    entityType: "DisbursementRequest",
    entityId: disbursement.id,
    metadata: {
      supportRequestId: disbursement.supportRequestId,
      status: parsed.data.status,
      receiptUrl: parsed.data.receiptUrl ?? null,
    },
  });
  return { success: true };
}
