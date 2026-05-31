import "server-only";

import { LegalTemplateType } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";
import {
  DEFAULT_TEMPLATES,
  serializeTemplateBody,
} from "@/lib/agreements/template-content";

export async function ensureDefaultLegalTemplates(): Promise<void> {
  for (const template of DEFAULT_TEMPLATES) {
    await prisma.legalTemplate.upsert({
      where: {
        type_version: {
          type: template.type as LegalTemplateType,
          version: template.version,
        },
      },
      create: {
        type: template.type as LegalTemplateType,
        version: template.version,
        title: template.title,
        bodyMarkdown: serializeTemplateBody(template.body),
        effectiveAt: template.effectiveAt,
        isActive: true,
      },
      update: {},
    });
  }
}

export async function getActiveTemplatesByType(type: LegalTemplateType) {
  await ensureDefaultLegalTemplates();
  return prisma.legalTemplate.findMany({
    where: { type, isActive: true },
    orderBy: { effectiveAt: "desc" },
  });
}

export async function getDefaultTemplatePair() {
  await ensureDefaultLegalTemplates();
  const [csa, workAuth] = await Promise.all([
    prisma.legalTemplate.findFirst({
      where: { type: "CLIENT_SERVICES_AGREEMENT", isActive: true },
      orderBy: { effectiveAt: "desc" },
    }),
    prisma.legalTemplate.findFirst({
      where: { type: "WORK_AUTHORIZATION", isActive: true },
      orderBy: { effectiveAt: "desc" },
    }),
  ]);

  if (!csa || !workAuth) {
    throw new Error("Default legal templates are missing.");
  }

  return { csa, workAuth };
}
