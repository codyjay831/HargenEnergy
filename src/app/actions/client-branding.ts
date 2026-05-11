"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { auth } from "@/auth";
import { Role } from "@/generated/prisma/client";
import { discoverLogoUrlFromWebsite } from "@/lib/client-branding";
import { prisma } from "@/lib/prisma";

const brandingSchema = z.object({
  clientId: z.string().min(1).max(128),
  logoUrl: z
    .string()
    .trim()
    .max(2000)
    .optional()
    .nullable()
    .refine(
      (v) => {
        if (!v) return true;
        try {
          const u = new URL(v);
          return u.protocol === "http:" || u.protocol === "https:";
        } catch {
          return false;
        }
      },
      { message: "Logo URL must be a valid http(s) URL." },
    ),
  brandAccent: z
    .string()
    .trim()
    .max(32)
    .optional()
    .nullable()
    .refine(
      (v) => !v || /^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/.test(v),
      { message: "Accent must be a hex color like #0f172a." },
    ),
});

async function requireAdmin() {
  const session = await auth();
  if (!session?.user || session.user.role !== Role.ADMIN) {
    throw new Error("Unauthorized. Admin access required.");
  }
}

export async function updateClientBranding(data: {
  clientId: string;
  logoUrl?: string | null;
  brandAccent?: string | null;
}) {
  await requireAdmin();

  const parsed = brandingSchema.safeParse(data);
  if (!parsed.success) {
    return { error: "Invalid branding values." };
  }

  const { clientId, logoUrl, brandAccent } = parsed.data;

  await prisma.client.update({
    where: { id: clientId },
    data: {
      logoUrl: logoUrl || null,
      brandAccent: brandAccent || null,
    },
  });

  revalidatePath(`/admin/clients/${clientId}`);
  revalidatePath("/portal");
  return { success: true };
}

export async function pullClientLogoFromWebsite(clientId: string) {
  await requireAdmin();

  const client = await prisma.client.findUnique({ where: { id: clientId } });
  if (!client) {
    return { error: "Client not found." };
  }

  if (!client.website) {
    return { error: "Add a company website before pulling a logo." };
  }

  const logoUrl = await discoverLogoUrlFromWebsite(client.website);
  if (!logoUrl) {
    return { error: "Could not find a logo on that website. Paste a logo URL instead." };
  }

  await prisma.client.update({
    where: { id: clientId },
    data: { logoUrl },
  });

  revalidatePath(`/admin/clients/${clientId}`);
  revalidatePath("/portal");
  return { success: true, logoUrl };
}
