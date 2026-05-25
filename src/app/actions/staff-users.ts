"use server";

import { randomBytes } from "node:crypto";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { revalidatePath } from "next/cache";

import { requireStaff } from "@/lib/auth-guards";
import { prisma } from "@/lib/prisma";
import { Role, StaffRole } from "@/generated/prisma/client";
import {
  buildPasswordResetUrl,
  createPasswordResetTokenForUser,
} from "@/lib/password-reset-token";
import { sendStaffInviteEmail } from "@/lib/email";
import { writeAuditLog } from "@/lib/audit-log";
import { resolveStaffRole } from "@/lib/permissions";

const inviteStaffSchema = z.object({
  email: z
    .string()
    .email("Invalid email address")
    .max(254)
    .transform((v) => v.trim().toLowerCase()),
  name: z.string().trim().max(120).optional(),
  staffRole: z.nativeEnum(StaffRole).default(StaffRole.MEMBER),
});

async function assertOwner(userId: string): Promise<void> {
  const actor = await prisma.user.findUnique({
    where: { id: userId },
    select: { staffRole: true },
  });
  if (!actor || resolveStaffRole(actor.staffRole) !== StaffRole.OWNER) {
    throw new Error("Forbidden. Owner access required.");
  }
}

async function getActiveOwnerCount(): Promise<number> {
  return prisma.user.count({
    where: {
      role: Role.ADMIN,
      staffRole: StaffRole.OWNER,
      deactivatedAt: null,
    },
  });
}

export async function listStaffUsers() {
  await requireStaff();
  const users = await prisma.user.findMany({
    where: { role: Role.ADMIN },
    select: {
      id: true,
      name: true,
      email: true,
      staffRole: true,
      deactivatedAt: true,
      createdAt: true,
      lastLoginAt: true,
    },
    orderBy: [{ staffRole: "asc" }, { createdAt: "asc" }],
  });
  return { users };
}

export async function inviteStaffUser(data: {
  email: string;
  name?: string;
  staffRole?: StaffRole;
}) {
  const session = await requireStaff("staff.manage");
  await assertOwner(session.user.id);

  const parsed = inviteStaffSchema.safeParse(data);
  if (!parsed.success) {
    return { error: "Please provide a valid team member email." };
  }

  const roleToAssign = parsed.data.staffRole ?? StaffRole.MEMBER;
  if (roleToAssign !== StaffRole.MEMBER) {
    return { error: "Invites can only create Team Member access." };
  }

  const existing = await prisma.user.findUnique({ where: { email: parsed.data.email } });
  if (existing && existing.role === Role.CLIENT) {
    return { error: "That email is already used for a client portal user." };
  }

  const placeholderPassword = randomBytes(32).toString("hex");
  const passwordHash = await bcrypt.hash(placeholderPassword, 12);

  const user = await prisma.user.upsert({
    where: { email: parsed.data.email },
    create: {
      email: parsed.data.email,
      name: parsed.data.name ?? null,
      passwordHash,
      role: Role.ADMIN,
      staffRole: StaffRole.MEMBER,
      clientRole: null,
      clientId: null,
      invitedById: session.user.id,
      deactivatedAt: null,
    },
    update: {
      name: parsed.data.name ?? existing?.name ?? null,
      role: Role.ADMIN,
      staffRole: StaffRole.MEMBER,
      clientRole: null,
      clientId: null,
      passwordHash,
      passwordChangedAt: new Date(),
      invitedById: session.user.id,
      deactivatedAt: null,
    },
  });

  const rawToken = await createPasswordResetTokenForUser(user.id);
  const resetUrl = buildPasswordResetUrl(rawToken);
  const emailResult = await sendStaffInviteEmail({
    to: user.email,
    resetUrl,
    name: user.name ?? undefined,
  });
  if ("error" in emailResult && emailResult.error) {
    return {
      error:
        "Staff user saved, but the invite email could not be sent. Resend after email is configured.",
    };
  }

  await writeAuditLog({
    actorUserId: session.user.id,
    action: "staff_user.invite",
    entityType: "User",
    entityId: user.id,
    metadata: { email: user.email, staffRole: user.staffRole },
  });

  revalidatePath("/admin/team");
  return { success: true, userId: user.id };
}

export async function resendStaffInvite(userId: string) {
  const session = await requireStaff("staff.manage");
  await assertOwner(session.user.id);

  const user = await prisma.user.findFirst({
    where: { id: userId, role: Role.ADMIN },
    select: { id: true, email: true, name: true },
  });
  if (!user) return { error: "Staff user not found." };

  const rawToken = await createPasswordResetTokenForUser(user.id);
  const resetUrl = buildPasswordResetUrl(rawToken);
  const emailResult = await sendStaffInviteEmail({
    to: user.email,
    resetUrl,
    name: user.name ?? undefined,
  });
  if ("error" in emailResult && emailResult.error) {
    return { error: "Invite email could not be sent." };
  }

  await writeAuditLog({
    actorUserId: session.user.id,
    action: "staff_user.resend_invite",
    entityType: "User",
    entityId: user.id,
    metadata: { email: user.email },
  });

  revalidatePath("/admin/team");
  return { success: true };
}

export async function changeStaffRole(userId: string, staffRole: StaffRole) {
  const session = await requireStaff("staff.manage");
  await assertOwner(session.user.id);

  const target = await prisma.user.findFirst({
    where: { id: userId, role: Role.ADMIN, deactivatedAt: null },
    select: { id: true, staffRole: true },
  });
  if (!target) return { error: "Staff user not found." };

  if (target.id === session.user.id && staffRole !== StaffRole.OWNER) {
    const owners = await getActiveOwnerCount();
    if (owners <= 1) {
      return { error: "Cannot demote the last Owner." };
    }
  }

  await prisma.user.update({
    where: { id: userId },
    data: { staffRole },
  });

  await writeAuditLog({
    actorUserId: session.user.id,
    action: "staff_user.change_role",
    entityType: "User",
    entityId: userId,
    metadata: { from: target.staffRole, to: staffRole },
  });

  revalidatePath("/admin/team");
  return { success: true };
}

export async function deactivateStaffUser(userId: string) {
  const session = await requireStaff("staff.manage");
  await assertOwner(session.user.id);

  const target = await prisma.user.findFirst({
    where: { id: userId, role: Role.ADMIN, deactivatedAt: null },
    select: { id: true, staffRole: true },
  });
  if (!target) return { error: "Staff user not found." };

  if (target.id === session.user.id) {
    return { error: "Cannot deactivate your own account." };
  }
  if (resolveStaffRole(target.staffRole) === StaffRole.OWNER) {
    const owners = await getActiveOwnerCount();
    if (owners <= 1) {
      return { error: "Cannot deactivate the last Owner." };
    }
  }

  await prisma.user.update({
    where: { id: userId },
    data: { deactivatedAt: new Date() },
  });

  await writeAuditLog({
    actorUserId: session.user.id,
    action: "staff_user.deactivate",
    entityType: "User",
    entityId: userId,
  });

  revalidatePath("/admin/team");
  return { success: true };
}
