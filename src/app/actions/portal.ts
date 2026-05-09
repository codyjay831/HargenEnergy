"use server";

import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { RequestStatus, Urgency, AuthorType } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { sendInternalRequestAlert } from "@/lib/email";

export async function submitPortalRequest(data: {
  title: string;
  supportNeeded: string;
  description: string;
  urgency: Urgency;
  customerName?: string;
  utilityAhj?: string;
  toolsContext?: string;
  desiredOutcome?: string;
}) {
  const session = await auth();
  const clientId = session?.user?.clientId;

  if (!session?.user || !clientId) {
    return { error: "Unauthorized. Client access required." };
  }

  try {
    const client = await prisma.client.findUnique({
      where: { id: clientId }
    });

    if (!client) {
      return { error: "Client record not found." };
    }

    // Combine extra fields into description if needed, or store them in a way that's useful
    const fullDescription = `
${data.description}

---
Customer/Job: ${data.customerName || "N/A"}
Utility/AHJ: ${data.utilityAhj || "N/A"}
Tools/Context: ${data.toolsContext || "N/A"}
Desired Outcome: ${data.desiredOutcome || "N/A"}
    `.trim();

    const supportRequest = await prisma.supportRequest.create({
      data: {
        clientId,
        title: data.title,
        supportNeeded: data.supportNeeded,
        description: fullDescription,
        urgency: data.urgency,
        status: RequestStatus.NEW,
      },
    });

    // Send internal alert
    try {
      await sendInternalRequestAlert({
        companyName: client.companyName,
        contactName: client.contactName,
        email: client.email,
        phone: client.phone,
        supportNeeded: data.supportNeeded,
        plan: client.planType,
        urgency: data.urgency,
        description: fullDescription,
        requestId: supportRequest.id,
      });
    } catch (emailError) {
      console.error("Failed to send internal alert for portal request:", emailError);
    }

    revalidatePath("/portal");
    revalidatePath("/portal/requests");

    return { success: true, requestId: supportRequest.id };
  } catch (error) {
    console.error("Error submitting portal request:", error);
    return { error: "Failed to submit request. Please try again." };
  }
}

export async function addRequestComment(data: {
  requestId: string;
  body: string;
  isInternal?: boolean;
}) {
  const session = await auth();
  
  if (!session?.user) {
    return { error: "Unauthorized." };
  }

  const isAdmin = session.user.role === "ADMIN";
  const clientId = session.user.clientId;

  try {
    // Verify ownership if not admin
    const request = await prisma.supportRequest.findUnique({
      where: { id: data.requestId },
      include: { client: true }
    });

    if (!request) {
      return { error: "Request not found." };
    }

    if (!isAdmin && request.clientId !== clientId) {
      return { error: "Unauthorized. You do not have access to this request." };
    }

    const comment = await prisma.requestComment.create({
      data: {
        supportRequestId: data.requestId,
        authorUserId: session.user.id,
        authorType: isAdmin ? AuthorType.ADMIN : AuthorType.CLIENT,
        body: data.body,
        isInternal: isAdmin ? (data.isInternal || false) : false,
      },
    });

    // If client commented, maybe send an alert to admin
    if (!isAdmin) {
      // Send internal alert
      // We could use a new email helper for this, but for now let's just log it
      console.log(`Client ${request.client.companyName} commented on request ${request.title}`);
    }

    revalidatePath(`/portal/requests/${data.requestId}`);
    revalidatePath(`/admin/requests/${data.requestId}`);

    return { success: true, comment };
  } catch (error) {
    console.error("Error adding comment:", error);
    return { error: "Failed to add comment." };
  }
}
