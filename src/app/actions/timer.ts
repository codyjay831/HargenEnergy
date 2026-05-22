"use server";

import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { TimeEntryStatus } from "@/generated/prisma/client";

export async function startTimer(requestId: string) {
  const session = await auth();
  if (!session?.user || session.user.role !== "ADMIN") {
    throw new Error("Unauthorized");
  }

  await prisma.supportRequest.update({
    where: { id: requestId },
    data: {
      timerStartedAt: new Date(),
      blockerReason: null,
    },
  });

  revalidatePath(`/admin/requests/${requestId}`);
}

export async function pauseTimer(requestId: string, reason: string) {
  const session = await auth();
  if (!session?.user || session.user.role !== "ADMIN") {
    throw new Error("Unauthorized");
  }

  const request = await prisma.supportRequest.findUnique({
    where: { id: requestId },
    select: { timerStartedAt: true },
  });

  if (!request?.timerStartedAt) return;

  const now = new Date();
  const elapsedMinutes = Math.round(
    (now.getTime() - request.timerStartedAt.getTime()) / 60000
  );

  if (elapsedMinutes > 0) {
    await prisma.timeEntry.create({
      data: {
        clientId: (await prisma.supportRequest.findUnique({ where: { id: requestId }, select: { clientId: true } }))!.clientId,
        supportRequestId: requestId,
        date: now,
        minutes: elapsedMinutes,
        description: `Timer paused: ${reason}`,
        status: TimeEntryStatus.STAGED,
        createdById: session.user.id,
      },
    });
  }

  await prisma.supportRequest.update({
    where: { id: requestId },
    data: {
      timerStartedAt: null,
      blockerReason: reason,
    },
  });

  revalidatePath(`/admin/requests/${requestId}`);
}

export async function stopTimer(requestId: string) {
  const session = await auth();
  if (!session?.user || session.user.role !== "ADMIN") {
    throw new Error("Unauthorized");
  }

  const request = await prisma.supportRequest.findUnique({
    where: { id: requestId },
    select: { timerStartedAt: true, clientId: true },
  });

  if (!request?.timerStartedAt) return;

  const now = new Date();
  const elapsedMinutes = Math.round(
    (now.getTime() - request.timerStartedAt.getTime()) / 60000
  );

  let timeEntryId = null;
  if (elapsedMinutes > 0) {
    const entry = await prisma.timeEntry.create({
      data: {
        clientId: request.clientId,
        supportRequestId: requestId,
        date: now,
        minutes: elapsedMinutes,
        description: "Timer session",
        status: TimeEntryStatus.STAGED,
        createdById: session.user.id,
      },
    });
    timeEntryId = entry.id;
  }

  await prisma.supportRequest.update({
    where: { id: requestId },
    data: {
      timerStartedAt: null,
      blockerReason: null,
    },
  });

  revalidatePath(`/admin/requests/${requestId}`);
  return { elapsedMinutes, timeEntryId };
}
