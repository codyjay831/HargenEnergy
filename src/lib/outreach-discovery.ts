import "server-only";

import { prisma } from "@/lib/prisma";
import {
  OutreachDiscoveryStatus,
  OutreachSearchSource,
  Prisma,
} from "@/generated/prisma/client";
import {
  findExistingOutreachCompany,
  normalizeCompanyName,
  normalizeWebsiteDomain,
} from "@/lib/outreach-search";

export const PLACE_DETAILS_STALE_MS = 30 * 24 * 60 * 60 * 1000;
export const DISCOVERY_RETENTION_DAYS = 90;

export type DiscoveryIngestInput = {
  placeId: string;
  name: string;
  city?: string | null;
  state?: string | null;
  address?: string | null;
  website?: string | null;
  phone?: string | null;
  rating?: number | null;
  userRatingsTotal?: number | null;
  source: OutreachSearchSource;
  leadSource?: string | null;
  sourceQuery?: string | null;
  lastRunId?: string | null;
  detailsFetchedAt?: Date | null;
};

export function isRealPermitStackId(placeId: string): boolean {
  return Boolean(placeId) && !placeId.startsWith("contractor-");
}

export function extractGooglePlaceIdFromSourceUrl(sourceUrl?: string | null): string | null {
  if (!sourceUrl) {
    return null;
  }
  const match = sourceUrl.match(/place_id:([^&]+)/i);
  return match?.[1] ?? null;
}

export function placeDetailsAreFresh(detailsFetchedAt?: Date | null): boolean {
  if (!detailsFetchedAt) {
    return false;
  }
  return Date.now() - detailsFetchedAt.getTime() < PLACE_DETAILS_STALE_MS;
}

export async function findExistingDiscovery(input: {
  googlePlaceId?: string | null;
  permitStackId?: string | null;
  normalizedName?: string | null;
  city?: string | null;
  website?: string | null;
}) {
  if (input.googlePlaceId) {
    const byPlace = await prisma.outreachDiscovery.findUnique({
      where: { googlePlaceId: input.googlePlaceId },
    });
    if (byPlace) {
      return byPlace;
    }
  }

  if (input.permitStackId) {
    const byPermitStack = await prisma.outreachDiscovery.findFirst({
      where: { permitStackId: input.permitStackId },
    });
    if (byPermitStack) {
      return byPermitStack;
    }
  }

  const normalizedName = input.normalizedName ?? null;

  if (normalizedName && input.city) {
    const byNameCity = await prisma.outreachDiscovery.findFirst({
      where: {
        normalizedName,
        city: { equals: input.city, mode: "insensitive" },
      },
    });
    if (byNameCity) {
      return byNameCity;
    }
  }

  const domain = normalizeWebsiteDomain(input.website);
  if (domain) {
    const byWebsite = await prisma.outreachDiscovery.findFirst({
      where: {
        website: { contains: domain, mode: "insensitive" },
      },
    });
    if (byWebsite) {
      return byWebsite;
    }
  }

  return null;
}

export async function upsertDiscoveryFromSearchResult(input: DiscoveryIngestInput) {
  const isGoogle = input.source === OutreachSearchSource.GOOGLE;
  const googlePlaceId = isGoogle ? input.placeId : null;
  const permitStackId =
    input.source === OutreachSearchSource.PERMITSTACK && isRealPermitStackId(input.placeId)
      ? input.placeId
      : null;
  const normalizedName = normalizeCompanyName(input.name);

  const existingCompany = await findExistingOutreachCompany({
    name: input.name,
    city: input.city,
    state: input.state,
    website: input.website,
    googlePlaceId: googlePlaceId ?? undefined,
    permitStackContractorId: permitStackId ?? undefined,
  });

  const existingDiscovery = await findExistingDiscovery({
    googlePlaceId,
    permitStackId,
    normalizedName,
    city: input.city,
    website: input.website,
  });

  const status = existingCompany
    ? OutreachDiscoveryStatus.SAVED
    : existingDiscovery?.status === OutreachDiscoveryStatus.DISMISSED
      ? OutreachDiscoveryStatus.DISMISSED
      : existingDiscovery?.status ?? OutreachDiscoveryStatus.NEW;

  const data: Prisma.OutreachDiscoveryUncheckedCreateInput = {
    googlePlaceId,
    permitStackId,
    normalizedName,
    name: input.name,
    city: input.city ?? undefined,
    state: input.state ?? undefined,
    address: input.address ?? undefined,
    website: input.website ?? undefined,
    phone: input.phone ?? undefined,
    rating: input.rating ?? undefined,
    userRatingsTotal: input.userRatingsTotal ?? undefined,
    detailsFetchedAt: input.detailsFetchedAt ?? undefined,
    source: input.source,
    leadSource: input.leadSource ?? undefined,
    sourceQuery: input.sourceQuery ?? undefined,
    lastRunId: input.lastRunId ?? undefined,
    matchedCompanyId: existingCompany?.company.id ?? existingDiscovery?.matchedCompanyId ?? undefined,
    status,
    lastSeenAt: new Date(),
  };

  if (existingDiscovery) {
    return prisma.outreachDiscovery.update({
      where: { id: existingDiscovery.id },
      data: {
        ...data,
        googlePlaceId: googlePlaceId ?? existingDiscovery.googlePlaceId,
        permitStackId: permitStackId ?? existingDiscovery.permitStackId,
        website: input.website ?? existingDiscovery.website,
        phone: input.phone ?? existingDiscovery.phone,
        detailsFetchedAt: input.detailsFetchedAt ?? existingDiscovery.detailsFetchedAt,
        firstSeenAt: existingDiscovery.firstSeenAt,
      },
    });
  }

  return prisma.outreachDiscovery.create({ data });
}

export async function ingestSearchResultsIntoDiscoveryPool(
  results: DiscoveryIngestInput[],
  runId: string
) {
  const ingested = [];
  for (const result of results) {
    ingested.push(
      await upsertDiscoveryFromSearchResult({
        ...result,
        lastRunId: runId,
      })
    );
  }
  return ingested;
}

export async function pruneStaleDiscoveries(retentionDays = DISCOVERY_RETENTION_DAYS) {
  const cutoff = new Date(Date.now() - retentionDays * 24 * 60 * 60 * 1000);
  const result = await prisma.outreachDiscovery.deleteMany({
    where: {
      status: { in: [OutreachDiscoveryStatus.DISMISSED, OutreachDiscoveryStatus.NEW] },
      lastSeenAt: { lt: cutoff },
      matchedCompanyId: null,
    },
  });
  return result.count;
}
