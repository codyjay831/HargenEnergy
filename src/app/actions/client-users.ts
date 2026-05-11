"use server";

import { randomBytes } from "node:crypto";

import bcrypt from "bcryptjs";
import { revalidatePath } from "next/cache";
import { z } from "zod";

import { auth } from "@/auth";
import { Role } from "@/generated/prisma/client";
import { assertPortalInviteAllowed } from "@/lib/request-lifecycle";
import { prisma } from "@/lib/prisma";
import {
  buildPasswordResetUrl,
  createPasswordResetTokenForUser,
} from "@/lib/password-reset-token";
import { sendPortalInviteEmail } from "@/lib/email";

const inviteSchema = z.object({
  clientId: z.string().min(1).max(128),
  email: z
    .string()
    .email("Invalid email address")
    .max(254)
    .transform((v) => v.trim().toLowerCase()),
  name: z.string().trim().max(120).optional(),
});

async function requireAdmin() {
  const session = await auth();
  if (!session?.user || session.user.role !== Role.ADMIN) {
    throw new Error("Unauthorized. Admin access required.");
  }
  return session;
}

export async function inviteClientPortalUser(data: {
  clientId: string;
  email: string;
  name?: string;
}) {
  await requireAdmin();

  const parsed = inviteSchema.safeParse(data);
  if (!parsed.success) {
    return { error: "Please provide a valid email address." };
  }

  const { clientId, email, name } = parsed.data;

  const client = await prisma.client.findUnique({
    where: { id: clientId },
    include: { users: { where: { role: Role.CLIENT } } },
  });

  if (!client) {
    return { error: "Client not found." };
  }

  const inviteError = assertPortalInviteAllowed(client.status);
  if (inviteError) {
    return inviteError;
  }

  const existingUser = await prisma.user.findUnique({ where: { email } });
  if (existingUser) {
    if (existingUser.role === Role.ADMIN) {
      return { error: "That email belongs to an admin account." };
    }
    if (existingUser.clientId && existingUser.clientId !== clientId) {
      return { error: "That email is already linked to another company." };
    }
  }

  const placeholderPassword = randomBytes(32).toString("hex");
  const passwordHash = await bcrypt.hash(placeholderPassword, 12);

  const user = await prisma.user.upsert({
    where: { email },
    create: {
      email,
      name: name || client.contactName,
      passwordHash,
      role: Role.CLIENT,
      clientId,
    },
    update: {
      name: name || client.contactName,
      role: Role.CLIENT,
      clientId,
      passwordHash,
      passwordChangedAt: new Date(),
    },
  });

  const rawToken = await createPasswordResetTokenForUser(user.id);
  const resetUrl = buildPasswordResetUrl(rawToken);

  const emailResult = await sendPortalInviteEmail({
    to: user.email,
    companyName: client.companyName,
    resetUrl,
    logoUrl: client.logoUrl,
  });

  if ("error" in emailResult && emailResult.error) {
    return {
      error:
        "Portal user saved, but the invite email could not be sent. Resend the invite after email is configured.",
    };
  }

  revalidatePath(`/admin/clients/${clientId}`);
  return { success: true, userId: user.id };
}

export async function resendClientPortalInvite(clientId: string, userId: string) {
  await requireAdmin();

  const user = await prisma.user.findFirst({
    where: { id: userId, clientId, role: Role.CLIENT },
    include: { client: true },
  });

  if (!user?.client) {
    return { error: "Portal user not found for this client." };
  }

  const inviteError = assertPortalInviteAllowed(user.client.status);
  if (inviteError) {
    return inviteError;
  }

  const rawToken = await createPasswordResetTokenForUser(user.id);
  const resetUrl = buildPasswordResetUrl(rawToken);

  const emailResult = await sendPortalInviteEmail({
    to: user.email,
    companyName: user.client.companyName,
    resetUrl,
    logoUrl: user.client.logoUrl,
  });

  if ("error" in emailResult && emailResult.error) {
    return { error: "Invite email could not be sent." };
  }

  revalidatePath(`/admin/clients/${clientId}`);
  return { success: true };
}
