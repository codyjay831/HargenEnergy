"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { auth } from "@/auth";
import {
  ClientStatus,
  RequestStatus,
  Role,
  SupportRequestKind,
  SupportRequestSource,
  Urgency,
} from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";
import { isUrgencyValue } from "@/lib/ui-enums";
import { sendInternalRequestAlert } from "@/lib/email";

async function requireAdmin() {
  const session = await auth();
  if (!session?.user || session.user.role !== Role.ADMIN) {
    throw new Error("Unauthorized. Admin access required.");
  }
  return session;
}

export async function activateClient(clientId: string) {
  await requireAdmin();

  const client = await prisma.client.findUnique({ where: { id: clientId } });
  if (!client) {
    return { error: "Client not found." };
  }

  if (client.status === ClientStatus.ACTIVE) {
    return { success: true, client };
  }

  try {
    const updated = await prisma.client.update({
      where: { id: clientId },
      data: {
        status: ClientStatus.ACTIVE,
        activatedAt: client.activatedAt ?? new Date(),
      },
    });

    revalidatePath("/admin/clients");
    revalidatePath(`/admin/clients/${clientId}`);
    return { success: true, client: updated };
  } catch (error) {
    console.error("Error activating client:", error);
    return { error: "Failed to activate client." };
  }
}

const logOpsRequestSchema = z.object({
  clientId: z.string().min(1).max(128),
  title: z.string().trim().min(1).max(200),
  description: z.string().trim().min(1).max(8000),
  source: z.enum(["EMAIL", "PHONE", "TEXT", "VOICEMAIL", "ADMIN"]),
  urgency: z.string().optional(),
  supportNeeded: z.string().trim().max(500).optional(),
});

export async function logClientOpsRequest(data: {
  clientId: string;
  title: string;
  description: string;
  source: string;
  urgency?: string;
  supportNeeded?: string;
}) {
  await requireAdmin();

  const parsed = logOpsRequestSchema.safeParse(data);
  if (!parsed.success) {
    return { error: "Please check the request fields and try again." };
  }

  const { clientId, title, description, source, supportNeeded } = parsed.data;
  const urgency = parsed.data.urgency && isUrgencyValue(parsed.data.urgency)
    ? parsed.data.urgency
    : Urgency.NORMAL;

  const client = await prisma.client.findUnique({ where: { id: clientId } });
  if (!client) {
    return { error: "Client not found." };
  }

  if (client.status !== ClientStatus.ACTIVE) {
    return { error: "Log client ops requests only for active clients." };
  }

  try {
    const supportRequest = await prisma.supportRequest.create({
      data: {
        clientId,
        title,
        kind: SupportRequestKind.CLIENT_OPS,
        source: source as SupportRequestSource,
        supportNeeded: supportNeeded || null,
        description,
        urgency,
        status: RequestStatus.NEW,
      },
    });

    try {
      await sendInternalRequestAlert({
        companyName: client.companyName,
        contactName: client.contactName,
        email: client.email,
        phone: client.phone,
        supportNeeded: supportNeeded || null,
        plan: client.planType,
        urgency,
        description,
        requestId: supportRequest.id,
        kind: SupportRequestKind.CLIENT_OPS,
      });
    } catch (emailError) {
      console.error("Failed to send ops request alert:", emailError);
    }

    revalidatePath("/admin/requests");
    revalidatePath(`/admin/clients/${clientId}`);
    revalidatePath(`/admin/requests/${supportRequest.id}`);

    return { success: true, requestId: supportRequest.id };
  } catch (error) {
    console.error("Error logging client ops request:", error);
    return { error: "Failed to log client ops request." };
  }
}
