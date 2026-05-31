import "server-only";

import { headers } from "next/headers";
import { AgreementType } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";
import { PRIVACY_VERSION, TERMS_VERSION } from "@/lib/legal-versions";
import { getRequestIpFromHeaders } from "@/lib/rate-limit";

type RecordTermsAcceptanceInput = {
  userId: string;
  clientId?: string | null;
};

const CURRENT_VERSIONS: Record<AgreementType, string> = {
  [AgreementType.PORTAL_TERMS]: TERMS_VERSION,
  [AgreementType.PRIVACY]: PRIVACY_VERSION,
};

export async function hasAcceptedCurrentTerms(userId: string): Promise<boolean> {
  const requiredTypes = [AgreementType.PORTAL_TERMS, AgreementType.PRIVACY] as const;
  const acceptances = await prisma.agreementAcceptance.findMany({
    where: {
      userId,
      type: { in: [...requiredTypes] },
    },
    select: {
      type: true,
      version: true,
    },
  });

  return requiredTypes.every((type) =>
    acceptances.some(
      (acceptance) =>
        acceptance.type === type && acceptance.version === CURRENT_VERSIONS[type],
    ),
  );
}

export async function recordTermsAcceptance(input: RecordTermsAcceptanceInput) {
  const h = await headers();
  const acceptedIp = getRequestIpFromHeaders(h);
  const acceptedUserAgent = h.get("user-agent")?.trim() || null;
  const acceptedAt = new Date();

  await prisma.agreementAcceptance.createMany({
    data: [
      {
        userId: input.userId,
        clientId: input.clientId ?? null,
        type: AgreementType.PORTAL_TERMS,
        version: TERMS_VERSION,
        acceptedAt,
        acceptedIp,
        acceptedUserAgent,
      },
      {
        userId: input.userId,
        clientId: input.clientId ?? null,
        type: AgreementType.PRIVACY,
        version: PRIVACY_VERSION,
        acceptedAt,
        acceptedIp,
        acceptedUserAgent,
      },
    ],
  });
}
