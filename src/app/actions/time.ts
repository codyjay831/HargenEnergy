"use server";

import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { BillableType } from "@/generated/prisma/client";
import { assertBillableTimeOnRequest } from "@/lib/request-lifecycle";
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
        select: { kind: true, clientId: true },
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
    }

    const timeEntry = await prisma.timeEntry.create({
      data: {
        clientId: data.clientId,
        supportRequestId: data.supportRequestId || null,
        date: data.date,
        minutes: data.minutes,
        description: data.description,
        billableType,
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
