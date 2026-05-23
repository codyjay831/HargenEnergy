"use server";

import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { BillableType, TimeEntryStatus } from "@/generated/prisma/client";
import { assertBillableTimeOnRequest } from "@/lib/request-lifecycle";
import { assertRequestBasedBillableWorkAllowed } from "@/lib/engagement";
import { revalidatePath } from "next/cache";
import { isBillableTypeValue } from "@/lib/ui-enums";

export async function createTimeEntry(data: {
  clientId: string;
  supportRequestId?: string;
  date: Date;
  minutes: number;
  description: string;
  billableType: string;
}) {
  const session = await auth();

  if (!session?.user || session.user.role !== "ADMIN") {
    return { error: "Unauthorized. Admin access required." };
  }

  if (!isBillableTypeValue(data.billableType)) {
    return { error: "Invalid billable type." };
  }

  const billableType: BillableType = data.billableType;

  if (data.minutes <= 0) {
    return { error: "Minutes must be a positive integer." };
  }

  if (!data.description) {
    return { error: "Description is required." };
  }

  try {
    if (data.supportRequestId) {
      const request = await prisma.supportRequest.findUnique({
        where: { id: data.supportRequestId },
        select: {
          kind: true,
          clientId: true,
          handoffTier: true,
          pricingMode: true,
          flatPriceCents: true,
          client: { select: { engagementType: true } },
        },
      });

      if (!request) {
        return { error: "Support request not found." };
      }

      // Ensure the request belongs to the specified client
      if (request.clientId !== data.clientId) {
        return { error: "Support request does not belong to the specified client." };
      }

      const billableError = assertBillableTimeOnRequest(request.kind, billableType);
      if (billableError) {
        return billableError;
      }

      const rbError = assertRequestBasedBillableWorkAllowed({
        engagementType: request.client.engagementType,
        request,
        billableType,
      });
      if (!rbError.ok) {
        return { error: rbError.error };
      }
    }

    const timeEntry = await prisma.timeEntry.create({
      data: {
        clientId: data.clientId,
        supportRequestId: data.supportRequestId || null,
        date: data.date,
        minutes: data.minutes,
        description: data.description,
        billableType,
        status: TimeEntryStatus.CONFIRMED, // Manual entries are confirmed by default
        createdById: session.user.id,
      },
    });

    revalidatePath("/admin/time");
    revalidatePath(`/admin/clients/${data.clientId}`);
    if (data.supportRequestId) {
      revalidatePath(`/admin/requests/${data.supportRequestId}`);
    }

    return { success: true, timeEntry };
  } catch (error) {
    console.error("Error creating time entry:", error);
    return { error: "Failed to create time entry." };
  }
}

export async function deleteTimeEntry(id: string) {
  const session = await auth();

  if (!session?.user || session.user.role !== "ADMIN") {
    return { error: "Unauthorized. Admin access required." };
  }

  try {
    const timeEntry = await prisma.timeEntry.delete({
      where: { id },
    });

    revalidatePath("/admin/time");
    revalidatePath(`/admin/clients/${timeEntry.clientId}`);
    if (timeEntry.supportRequestId) {
      revalidatePath(`/admin/requests/${timeEntry.supportRequestId}`);
    }

    return { success: true };
  } catch (error) {
    console.error("Error deleting time entry:", error);
    return { error: "Failed to delete time entry." };
  }
}

export async function confirmTimeEntry(id: string) {
  const session = await auth();

  if (!session?.user || session.user.role !== "ADMIN") {
    return { error: "Unauthorized. Admin access required." };
  }

  try {
    const timeEntry = await prisma.timeEntry.update({
      where: { id },
      data: { status: TimeEntryStatus.CONFIRMED },
    });

    revalidatePath("/admin/time");
    revalidatePath(`/admin/clients/${timeEntry.clientId}`);
    if (timeEntry.supportRequestId) {
      revalidatePath(`/admin/requests/${timeEntry.supportRequestId}`);
    }

    return { success: true, timeEntry };
  } catch (error) {
    console.error("Error confirming time entry:", error);
    return { error: "Failed to confirm time entry." };
  }
}

export async function updateTimeEntry(id: string, data: {
  minutes?: number;
  description?: string;
  billableType?: string;
}) {
  const session = await auth();

  if (!session?.user || session.user.role !== "ADMIN") {
    return { error: "Unauthorized. Admin access required." };
  }

  if (data.billableType !== undefined && !isBillableTypeValue(data.billableType)) {
    return { error: "Invalid billable type." };
  }

  try {
    const existing = await prisma.timeEntry.findUnique({
      where: { id },
      include: {
        supportRequest: {
          select: {
            handoffTier: true,
            pricingMode: true,
            flatPriceCents: true,
            client: { select: { engagementType: true } },
          },
        },
      },
    });

    if (!existing) {
      return { error: "Time entry not found." };
    }

    const nextBillableType = (data.billableType ?? existing.billableType) as BillableType;

    if (existing.supportRequestId && existing.supportRequest) {
      const rbError = assertRequestBasedBillableWorkAllowed({
        engagementType: existing.supportRequest.client.engagementType,
        request: existing.supportRequest,
        billableType: nextBillableType,
      });
      if (!rbError.ok) {
        return { error: rbError.error };
      }
    }

    const timeEntry = await prisma.timeEntry.update({
      where: { id },
      data: {
        minutes: data.minutes,
        description: data.description,
        billableType: data.billableType as BillableType,
      },
    });

    revalidatePath("/admin/time");
    revalidatePath(`/admin/clients/${timeEntry.clientId}`);
    if (timeEntry.supportRequestId) {
      revalidatePath(`/admin/requests/${timeEntry.supportRequestId}`);
    }

    return { success: true, timeEntry };
  } catch (error) {
    console.error("Error updating time entry:", error);
    return { error: "Failed to update time entry." };
  }
}
