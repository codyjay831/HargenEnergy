import "server-only";

import { prisma } from "@/lib/prisma";
import {
  OutreachSearchSource,
  OutreachSearchStatus,
  Prisma,
} from "@/generated/prisma/client";

export const OUTREACH_SEARCH_RESULT_LIMIT = 20;
export const GOOGLE_NEXT_PAGE_DELAY_MS = 2000;

export type OutreachSearchReplayPayload = {
  results: unknown[];
  searchMode?: string | null;
  message?: string | null;
  resolvedJurisdiction?: string | null;
  attemptDiagnostics?: unknown[] | null;
};

export function buildOutreachSearchReplaySnapshot<T>(payload: {
  results: T[];
  searchMode?: string | null;
  message?: string | null;
  resolvedJurisdiction?: string | null;
  attemptDiagnostics?: unknown[] | null;
}): OutreachSearchReplayPayload {
  return {
    results: payload.results.slice(0, OUTREACH_SEARCH_RESULT_LIMIT),
    searchMode: payload.searchMode ?? null,
    message: payload.message ?? null,
    resolvedJurisdiction: payload.resolvedJurisdiction ?? null,
    attemptDiagnostics: payload.attemptDiagnostics ?? null,
  };
}

export type OutreachDuplicateMatchReason =
  | "source_id"
  | "website"
  | "name_city"
  | "name";

export type OutreachFinderMatch = {
  alreadySaved: boolean;
  matchedCompanyId: string | null;
  matchReason: OutreachDuplicateMatchReason | null;
  discoveryId?: string | null;
  discoveryStatus?: string | null;
};

export type FindExistingOutreachCompanyInput = {
  name?: string | null;
  city?: string | null;
  state?: string | null;
  website?: string | null;
  googlePlaceId?: string | null;
  permitStackContractorId?: string | null;
};

export function normalizeCompanyName(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^\w\s]/g, " ")
    .replace(/\b(llc|inc|corp|corporation|co|company|ltd|limited)\b/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function normalizeWebsiteDomain(website?: string | null): string | null {
  if (!website) {
    return null;
  }

  try {
    const normalized = website.startsWith("http") ? website : `https://${website}`;
    return new URL(normalized).hostname.replace(/^www\./, "").toLowerCase();
  } catch {
    return null;
  }
}

export function isRealPermitStackContractorId(id?: string | null): boolean {
  return Boolean(id) && !id!.startsWith("contractor-");
}

export async function findExistingOutreachCompany(
  input: FindExistingOutreachCompanyInput
) {
  if (input.googlePlaceId) {
    const byGooglePlace = await prisma.outreachCompany.findFirst({
      where: { googlePlaceId: input.googlePlaceId },
    });

    if (byGooglePlace) {
      return { company: byGooglePlace, reason: "source_id" as const };
    }

    const legacyBySourceUrl = await prisma.outreachCompany.findFirst({
      where: {
        sourceUrl: {
          contains: input.googlePlaceId,
          mode: "insensitive",
        },
      },
    });

    if (legacyBySourceUrl) {
      return { company: legacyBySourceUrl, reason: "source_id" as const };
    }
  }

  if (input.permitStackContractorId && isRealPermitStackContractorId(input.permitStackContractorId)) {
    const byPermitStack = await prisma.outreachCompany.findFirst({
      where: { permitStackId: input.permitStackContractorId },
    });

    if (byPermitStack) {
      return { company: byPermitStack, reason: "source_id" as const };
    }
  }

  const domain = normalizeWebsiteDomain(input.website);
  if (domain) {
    const byWebsite = await prisma.outreachCompany.findFirst({
      where: {
        website: {
          contains: domain,
          mode: "insensitive",
        },
      },
    });

    if (byWebsite) {
      return { company: byWebsite, reason: "website" as const };
    }
  }

  const normalizedName = input.name ? normalizeCompanyName(input.name) : null;

  if (normalizedName && input.city) {
    const byNameCity = await prisma.outreachCompany.findFirst({
      where: {
        OR: [
          {
            AND: [
              { normalizedName },
              { city: { equals: input.city, mode: "insensitive" } },
            ],
          },
          {
            AND: [
              { name: { equals: input.name!, mode: "insensitive" } },
              { city: { equals: input.city, mode: "insensitive" } },
            ],
          },
        ],
      },
    });

    if (byNameCity) {
      return { company: byNameCity, reason: "name_city" as const };
    }
  }

  if (normalizedName) {
    const byName = await prisma.outreachCompany.findFirst({
      where: {
        OR: [
          { normalizedName },
          { name: { equals: input.name!, mode: "insensitive" } },
        ],
      },
    });

    if (byName) {
      return { company: byName, reason: "name" as const };
    }
  }

  return null;
}

type BatchCompanyRow = {
  id: string;
  name: string;
  normalizedName: string | null;
  city: string | null;
  website: string | null;
  googlePlaceId: string | null;
  permitStackId: string | null;
};

type BatchDiscoveryRow = {
  id: string;
  googlePlaceId: string | null;
  permitStackId: string | null;
  normalizedName: string;
  city: string | null;
  website: string | null;
  matchedCompanyId: string | null;
  status: string;
};

function matchCompanyInBatch(
  result: {
    placeId: string;
    name: string;
    city?: string | null;
    website?: string | null;
  },
  companies: BatchCompanyRow[]
): { company: BatchCompanyRow; reason: OutreachDuplicateMatchReason } | null {
  const byPlace = companies.find((c) => c.googlePlaceId === result.placeId);
  if (byPlace) {
    return { company: byPlace, reason: "source_id" };
  }

  if (isRealPermitStackContractorId(result.placeId)) {
    const byPermit = companies.find((c) => c.permitStackId === result.placeId);
    if (byPermit) {
      return { company: byPermit, reason: "source_id" };
    }
  }

  const domain = normalizeWebsiteDomain(result.website);
  if (domain) {
    const byWebsite = companies.find((c) =>
      c.website?.toLowerCase().includes(domain)
    );
    if (byWebsite) {
      return { company: byWebsite, reason: "website" };
    }
  }

  const normalizedName = normalizeCompanyName(result.name);
  if (normalizedName && result.city) {
    const byNameCity = companies.find(
      (c) =>
        (c.normalizedName === normalizedName ||
          c.name.toLowerCase() === result.name.toLowerCase()) &&
        c.city?.toLowerCase() === result.city?.toLowerCase()
    );
    if (byNameCity) {
      return { company: byNameCity, reason: "name_city" };
    }
  }

  if (normalizedName) {
    const byName = companies.find(
      (c) =>
        c.normalizedName === normalizedName ||
        c.name.toLowerCase() === result.name.toLowerCase()
    );
    if (byName) {
      return { company: byName, reason: "name" };
    }
  }

  return null;
}

function matchDiscoveryInBatch(
  result: {
    placeId: string;
    name: string;
    city?: string | null;
    website?: string | null;
  },
  discoveries: BatchDiscoveryRow[]
): BatchDiscoveryRow | null {
  const byPlace = discoveries.find((d) => d.googlePlaceId === result.placeId);
  if (byPlace) {
    return byPlace;
  }

  if (isRealPermitStackContractorId(result.placeId)) {
    const byPermit = discoveries.find((d) => d.permitStackId === result.placeId);
    if (byPermit) {
      return byPermit;
    }
  }

  const normalizedName = normalizeCompanyName(result.name);
  if (normalizedName && result.city) {
    const byNameCity = discoveries.find(
      (d) =>
        d.normalizedName === normalizedName &&
        d.city?.toLowerCase() === result.city?.toLowerCase()
    );
    if (byNameCity) {
      return byNameCity;
    }
  }

  const domain = normalizeWebsiteDomain(result.website);
  if (domain) {
    const byWebsite = discoveries.find((d) =>
      d.website?.toLowerCase().includes(domain)
    );
    if (byWebsite) {
      return byWebsite;
    }
  }

  return null;
}

export async function annotateFinderResults<
  T extends {
    placeId: string;
    name: string;
    city?: string | null;
    state?: string | null;
    website?: string | null;
    phone?: string | null;
  },
>(results: T[]) {
  const sliced = results.slice(0, OUTREACH_SEARCH_RESULT_LIMIT);
  if (sliced.length === 0) {
    return [];
  }

  const placeIds = sliced.map((r) => r.placeId);
  const permitStackIds = placeIds.filter((id) => isRealPermitStackContractorId(id));
  const normalizedNames = [...new Set(sliced.map((r) => normalizeCompanyName(r.name)))];

  const companyOr: Prisma.OutreachCompanyWhereInput[] = [
    { googlePlaceId: { in: placeIds } },
    { normalizedName: { in: normalizedNames } },
  ];
  if (permitStackIds.length > 0) {
    companyOr.push({ permitStackId: { in: permitStackIds } });
  }

  const discoveryOr: Prisma.OutreachDiscoveryWhereInput[] = [
    { googlePlaceId: { in: placeIds } },
    { normalizedName: { in: normalizedNames } },
  ];
  if (permitStackIds.length > 0) {
    discoveryOr.push({ permitStackId: { in: permitStackIds } });
  }

  const [companies, discoveries] = await Promise.all([
    prisma.outreachCompany.findMany({
      where: { OR: companyOr },
      select: {
        id: true,
        name: true,
        normalizedName: true,
        city: true,
        website: true,
        googlePlaceId: true,
        permitStackId: true,
      },
    }),
    prisma.outreachDiscovery.findMany({
      where: { OR: discoveryOr },
      select: {
        id: true,
        googlePlaceId: true,
        permitStackId: true,
        normalizedName: true,
        city: true,
        website: true,
        matchedCompanyId: true,
        status: true,
      },
    }),
  ]);

  return sliced.map((result) => {
    const match = matchCompanyInBatch(result, companies);
    const discovery = matchDiscoveryInBatch(result, discoveries);

    return {
      ...result,
      alreadySaved: !!match,
      matchedCompanyId: match?.company.id ?? discovery?.matchedCompanyId ?? null,
      matchReason: match?.reason ?? null,
      discoveryId: discovery?.id ?? null,
      discoveryStatus: discovery?.status ?? null,
    };
  });
}

export async function logOutreachSearchRun(data: {
  source: OutreachSearchSource;
  createdById?: string | null;
  queryText?: string | null;
  params?: Record<string, unknown> | null;
  resultCount: number;
  searchMode?: string | null;
  status: OutreachSearchStatus;
  errorMessage?: string | null;
  resultSnapshot?: unknown;
}) {
  return prisma.outreachSearchRun.create({
    data: {
      source: data.source,
      createdById: data.createdById ?? undefined,
      queryText: data.queryText ?? undefined,
      params: (data.params ?? undefined) as Prisma.InputJsonValue | undefined,
      resultCount: data.resultCount,
      searchMode: data.searchMode ?? undefined,
      status: data.status,
      errorMessage: data.errorMessage ?? undefined,
      resultSnapshot: (data.resultSnapshot ?? undefined) as
        | Prisma.InputJsonValue
        | undefined,
    },
  });
}

export async function getRecentOutreachSearchRuns(limit = 20) {
  return prisma.outreachSearchRun.findMany({
    orderBy: { createdAt: "desc" },
    take: limit,
    include: {
      createdBy: {
        select: {
          id: true,
          name: true,
          email: true,
        },
      },
    },
  });
}

export async function getOutreachSearchRunById(runId: string) {
  return prisma.outreachSearchRun.findUnique({
    where: { id: runId },
    include: {
      createdBy: {
        select: {
          id: true,
          name: true,
          email: true,
        },
      },
    },
  });
}

export function parseAddress(formattedAddress: string) {
  const parts = formattedAddress.split(", ");
  if (parts.length >= 3) {
    const city = parts[parts.length - 3];
    const stateZip = parts[parts.length - 2].split(" ");
    const state = stateZip[0];
    return { city, state };
  }
  return { city: null, state: null };
}
