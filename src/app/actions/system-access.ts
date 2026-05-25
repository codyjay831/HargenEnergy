"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import {
  SystemAccessMethod,
  SystemAccessStatus,
  SystemAccessType,
} from "@/generated/prisma/client";
import { requireClientUser, requireStaff } from "@/lib/auth-guards";
import {
  decryptFieldValue,
  encryptFieldValue,
} from "@/lib/crypto/field-encryption";
import { prisma } from "@/lib/prisma";

const systemTypeSchema = z.nativeEnum(SystemAccessType);
const accessMethodSchema = z.nativeEnum(SystemAccessMethod);
const accessStatusSchema = z.nativeEnum(SystemAccessStatus);

const adminAccessSchema = z.object({
  clientId: z.string().min(1).max(128),
  systemType: systemTypeSchema,
  label: z.string().trim().min(1).max(200),
  loginUrl: z.string().trim().max(2000).optional().nullable(),
  username: z.string().trim().max(200).optional().nullable(),
  accessMethod: accessMethodSchema,
  vaultLink: z.string().trim().max(2000).optional().nullable(),
  adminSecureNote: z.string().trim().max(4000).optional().nullable(),
  status: accessStatusSchema.optional(),
  notes: z.string().trim().max(4000).optional().nullable(),
});

const clientHandoffSchema = z.object({
  accessId: z.string().min(1).max(128),
  accessMethod: accessMethodSchema,
  vaultLink: z.string().trim().max(2000).optional().nullable(),
  username: z.string().trim().max(200).optional().nullable(),
  notes: z.string().trim().max(2000).optional().nullable(),
});

export async function createClientSystemAccess(
  data: z.infer<typeof adminAccessSchema>,
) {
  await requireStaff();

  const parsed = adminAccessSchema.safeParse(data);
  if (!parsed.success) {
    return { error: "Invalid system access details." };
  }

  const record = await prisma.clientSystemAccess.create({
    data: {
      ...parsed.data,
      vaultLink: encryptFieldValue(parsed.data.vaultLink || null),
      adminSecureNote: encryptFieldValue(parsed.data.adminSecureNote || null),
      status: parsed.data.status ?? SystemAccessStatus.NOT_PROVIDED,
    },
  });

  revalidatePath(`/admin/clients/${parsed.data.clientId}`);
  revalidatePath("/portal/access");
  return { success: true, id: record.id };
}

export async function updateClientSystemAccess(
  accessId: string,
  data: Partial<z.infer<typeof adminAccessSchema>>,
) {
  await requireStaff();

  const existing = await prisma.clientSystemAccess.findUnique({
    where: { id: accessId },
  });
  if (!existing) {
    return { error: "System access record not found." };
  }

  const parsed = adminAccessSchema.partial().safeParse(data);
  if (!parsed.success) {
    return { error: "Invalid system access details." };
  }

  await prisma.clientSystemAccess.update({
    where: { id: accessId },
    data: {
      ...parsed.data,
      ...(parsed.data.vaultLink !== undefined
        ? { vaultLink: encryptFieldValue(parsed.data.vaultLink || null) }
        : {}),
      ...(parsed.data.adminSecureNote !== undefined
        ? { adminSecureNote: encryptFieldValue(parsed.data.adminSecureNote || null) }
        : {}),
    },
  });

  revalidatePath(`/admin/clients/${existing.clientId}`);
  revalidatePath("/portal/access");
  return { success: true };
}

export async function verifyClientSystemAccess(accessId: string) {
  await requireStaff();

  const existing = await prisma.clientSystemAccess.findUnique({
    where: { id: accessId },
  });
  if (!existing) {
    return { error: "System access record not found." };
  }

  await prisma.clientSystemAccess.update({
    where: { id: accessId },
    data: {
      status: SystemAccessStatus.VERIFIED,
      lastVerifiedAt: new Date(),
    },
  });

  revalidatePath(`/admin/clients/${existing.clientId}`);
  revalidatePath("/portal/access");
  return { success: true };
}

export async function submitClientSystemAccessHandoff(
  data: z.infer<typeof clientHandoffSchema>,
) {
  const session = await requireClientUser();

  const parsed = clientHandoffSchema.safeParse(data);
  if (!parsed.success) {
    return { error: "Please fix the highlighted fields." };
  }

  const existing = await prisma.clientSystemAccess.findUnique({
    where: { id: parsed.data.accessId },
  });

  if (!existing || existing.clientId !== session.user.clientId) {
    return { error: "System access record not found." };
  }

  const hasVault =
    parsed.data.accessMethod === SystemAccessMethod.VAULT_LINK &&
    !!parsed.data.vaultLink;
  const hasInvite =
    parsed.data.accessMethod === SystemAccessMethod.CLIENT_WILL_INVITE;
  const hasUsername = !!parsed.data.username;

  if (!hasVault && !hasInvite && !hasUsername) {
    return {
      error:
        "Provide a vault share link, username, or confirm you will invite our user.",
    };
  }

  await prisma.clientSystemAccess.update({
    where: { id: existing.id },
    data: {
      accessMethod: parsed.data.accessMethod,
      vaultLink: encryptFieldValue(parsed.data.vaultLink || null),
      username: parsed.data.username || null,
      notes: parsed.data.notes || existing.notes,
      status:
        hasVault || hasUsername || hasInvite
          ? SystemAccessStatus.PROVIDED
          : SystemAccessStatus.NOT_PROVIDED,
    },
  });

  revalidatePath("/portal/access");
  revalidatePath(`/admin/clients/${existing.clientId}`);
  return { success: true };
}

export async function getClientSystemAccessForAdmin(clientId: string) {
  await requireStaff();

  const rows = await prisma.clientSystemAccess.findMany({
    where: { clientId },
    orderBy: { createdAt: "asc" },
  });

  return rows.map((row) => ({
    ...row,
    vaultLink: decryptFieldValue(row.vaultLink),
    adminSecureNote: decryptFieldValue(row.adminSecureNote),
  }));
}
