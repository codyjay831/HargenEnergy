"use server";

import { randomBytes } from "node:crypto";

import bcrypt from "bcryptjs";
import { revalidatePath } from "next/cache";
import { z } from "zod";

import { Role } from "@/generated/prisma/client";
import { requireClientUser, requireStaff } from "@/lib/auth-guards";
import { assertPortalInviteAllowed } from "@/lib/request-lifecycle";
import { checkPortalInviteReadiness } from "@/lib/engagement";
import { prisma } from "@/lib/prisma";
import {
  buildPasswordResetUrl,
  createPasswordResetTokenForUser,
} from "@/lib/password-reset-token";
import { sendPortalInviteEmail } from "@/lib/email";
import { writeAuditLog } from "@/lib/audit-log";
import { resolveClientRole } from "@/lib/permissions";

const inviteSchema = z.object({
  clientId: z.string().min(1).max(128),
  email: z
    .string()
    .email("Invalid email address")
    .max(254)
    .transform((v) => v.trim().toLowerCase()),
  name: z.string().trim().max(120).optional(),
});

type InviteActor = {
  id: string;
  role: "ADMIN" | "CLIENT";
  clientId?: string | null;
};

async function assertClientOwner(actorUserId: string, actorClientId?: string | null) {
  if (!actorClientId) {
    throw new Error("Unauthorized. Client access required.");
  }
  const actor = await prisma.user.findUnique({
    where: { id: actorUserId },
    select: { clientRole: true },
  });
  if (!actor || resolveClientRole(actor.clientRole) !== "OWNER") {
    throw new Error("Forbidden. Owner access required.");
  }
}

async function inviteClientPortalUserInternal(
  actor: InviteActor,
  data: { clientId: string; email: string; name?: string },
) {
  const parsed = inviteSchema.safeParse(data);
  if (!parsed.success) {
    return { error: "Please provide a valid email address." };
  }

  const { clientId, email, name } = parsed.data;
  if (actor.role === "CLIENT" && actor.clientId !== clientId) {
    return { error: "Unauthorized. Client scope mismatch." };
  }

  const client = await prisma.client.findUnique({
    where: { id: clientId },
    include: {
      users: { where: { role: Role.CLIENT } },
      approvedWorkTasks: { select: { workTaskId: true } },
    },
  });

  if (!client) {
    return { error: "Client not found." };
  }

  const inviteError = assertPortalInviteAllowed(client.status);
  if (inviteError) {
    return inviteError;
  }

  const scopeReadiness = checkPortalInviteReadiness(client);
  if (!scopeReadiness.ready) {
    return { error: scopeReadiness.error };
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

  const existingClientRole = existingUser?.clientRole;
  const nextClientRole =
    actor.role === "CLIENT"
      ? "MEMBER"
      : client.users.length === 0
        ? "OWNER"
        : resolveClientRole(existingClientRole);

  const user = await prisma.user.upsert({
    where: { email },
    create: {
      email,
      name: name || client.contactName,
      passwordHash,
      role: Role.CLIENT,
      clientId,
      staffRole: null,
      clientRole: nextClientRole,
      invitedById: actor.id,
      deactivatedAt: null,
    },
    update: {
      name: name || client.contactName,
      role: Role.CLIENT,
      clientId,
      staffRole: null,
      clientRole: nextClientRole,
      passwordHash,
      passwordChangedAt: new Date(),
      invitedById: actor.id,
      deactivatedAt: null,
    },
  });

  const rawToken = await createPasswordResetTokenForUser(user.id);
  const resetUrl = buildPasswordResetUrl(rawToken);

  const emailResult = await sendPortalInviteEmail({
    to: user.email,
    companyName: client.companyName,
    resetUrl,
    logoUrl: client.logoUrl,
    clientId,
  });

  if ("error" in emailResult && emailResult.error) {
    return {
      error:
        "Portal user saved, but the invite email could not be sent. Resend the invite after email is configured.",
    };
  }

  revalidatePath(`/admin/clients/${clientId}`);
  revalidatePath("/portal/team");
  await writeAuditLog({
    actorUserId: actor.id,
    action: "client_user.invite",
    entityType: "User",
    entityId: user.id,
    metadata: {
      clientId,
      email: user.email,
      invitedByRole: actor.role,
      assignedClientRole: nextClientRole,
    },
  });
  return { success: true, userId: user.id };
}

export async function inviteClientPortalUser(data: {
  clientId: string;
  email: string;
  name?: string;
}) {
  const session = await requireStaff("clients.manage");
  return inviteClientPortalUserInternal(
    {
      id: session.user.id,
      role: "ADMIN",
    },
    data,
  );
}

export async function resendClientPortalInvite(clientId: string, userId: string) {
  const session = await requireStaff("clients.manage");

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
    clientId,
  });

  if ("error" in emailResult && emailResult.error) {
    return { error: "Invite email could not be sent." };
  }

  revalidatePath(`/admin/clients/${clientId}`);
  await writeAuditLog({
    actorUserId: session.user.id,
    action: "client_user.resend_invite",
    entityType: "User",
    entityId: user.id,
    metadata: {
      clientId,
      email: user.email,
    },
  });
  return { success: true };
}

export async function listClientTeamUsers() {
  const session = await requireClientUser();
  const users = await prisma.user.findMany({
    where: {
      role: Role.CLIENT,
      clientId: session.user.clientId,
    },
    select: {
      id: true,
      email: true,
      name: true,
      clientRole: true,
      deactivatedAt: true,
      createdAt: true,
      lastLoginAt: true,
    },
    orderBy: [{ clientRole: "asc" }, { createdAt: "asc" }],
  });
  return { users };
}

export async function inviteClientTeamUser(data: { email: string; name?: string }) {
  const session = await requireClientUser();
  await assertClientOwner(session.user.id, session.user.clientId);
  return inviteClientPortalUserInternal(
    {
      id: session.user.id,
      role: "CLIENT",
      clientId: session.user.clientId,
    },
    {
      clientId: session.user.clientId!,
      email: data.email,
      name: data.name,
    },
  );
}

export async function resendClientTeamInvite(userId: string) {
  const session = await requireClientUser();
  await assertClientOwner(session.user.id, session.user.clientId);
  return resendClientPortalInvite(session.user.clientId!, userId);
}

export async function deactivateClientTeamUser(userId: string) {
  const session = await requireClientUser();
  const clientId = session.user.clientId;
  await assertClientOwner(session.user.id, clientId);
  if (!clientId) {
    return { error: "Unauthorized. Client access required." };
  }

  const target = await prisma.user.findFirst({
    where: { id: userId, role: Role.CLIENT, clientId, deactivatedAt: null },
    select: { id: true, clientRole: true },
  });
  if (!target) {
    return { error: "Team member not found." };
  }

  if (target.id === session.user.id) {
    return { error: "Transfer ownership before deactivating your own account." };
  }

  if (resolveClientRole(target.clientRole) === "OWNER") {
    const activeOwners = await prisma.user.count({
      where: {
        role: Role.CLIENT,
        clientId,
        clientRole: "OWNER",
        deactivatedAt: null,
      },
    });
    if (activeOwners <= 1) {
      return { error: "Cannot deactivate the last account owner." };
    }
  }

  await prisma.user.update({
    where: { id: userId },
    data: { deactivatedAt: new Date() },
  });

  await writeAuditLog({
    actorUserId: session.user.id,
    action: "client_user.deactivate",
    entityType: "User",
    entityId: userId,
    metadata: { clientId },
  });

  revalidatePath("/portal/team");
  return { success: true };
}

export async function transferClientOwnership(targetUserId: string) {
  const session = await requireClientUser();
  const clientId = session.user.clientId;
  await assertClientOwner(session.user.id, clientId);
  if (!clientId) {
    return { error: "Unauthorized. Client access required." };
  }
  if (targetUserId === session.user.id) {
    return { error: "Select a different team member to transfer ownership." };
  }

  const target = await prisma.user.findFirst({
    where: {
      id: targetUserId,
      role: Role.CLIENT,
      clientId,
      deactivatedAt: null,
    },
    select: { id: true },
  });
  if (!target) {
    return { error: "Target team member not found." };
  }

  await prisma.$transaction(async (tx) => {
    await tx.user.update({
      where: { id: targetUserId },
      data: { clientRole: "OWNER" },
    });
    await tx.user.update({
      where: { id: session.user.id },
      data: { clientRole: "MEMBER" },
    });
  });

  await writeAuditLog({
    actorUserId: session.user.id,
    action: "client_user.transfer_ownership",
    entityType: "Client",
    entityId: clientId,
    metadata: { fromUserId: session.user.id, toUserId: targetUserId },
  });

  revalidatePath("/portal/team");
  return { success: true };
}
