import "server-only";

import { prisma } from "@/lib/prisma";
import {
  OutreachSearchSource,
  OutreachSearchStatus,
  Prisma,
} from "@/generated/prisma/client";

export const OUTREACH_SEARCH_RESULT_LIMIT = 20;

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

export async function findExistingOutreachCompany(
  input: FindExistingOutreachCompanyInput
) {
  if (input.googlePlaceId) {
    const byGooglePlace = await prisma.outreachCompany.findFirst({
      where: {
        sourceUrl: {
          contains: input.googlePlaceId,
          mode: "insensitive",
        },
      },
    });

    if (byGooglePlace) {
      return { company: byGooglePlace, reason: "source_id" as const };
    }
  }

  if (input.permitStackContractorId) {
    const byPermitStack = await prisma.outreachCompany.findFirst({
      where: {
        sourceUrl: {
          contains: input.permitStackContractorId,
          mode: "insensitive",
        },
      },
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

  if (input.name && input.city) {
    const byNameCity = await prisma.outreachCompany.findFirst({
      where: {
        AND: [
          { name: { equals: input.name, mode: "insensitive" } },
          { city: { equals: input.city, mode: "insensitive" } },
        ],
      },
    });

    if (byNameCity) {
      return { company: byNameCity, reason: "name_city" as const };
    }
  }

  if (input.name) {
    const byName = await prisma.outreachCompany.findFirst({
      where: {
        name: { equals: input.name, mode: "insensitive" },
      },
    });

    if (byName) {
      return { company: byName, reason: "name" as const };
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
  },
>(results: T[]) {
  const annotated: Array<T & OutreachFinderMatch> = [];

  for (const result of results.slice(0, OUTREACH_SEARCH_RESULT_LIMIT)) {
    const match = await findExistingOutreachCompany({
      name: result.name,
      city: result.city,
      state: result.state,
      website: result.website,
      googlePlaceId: result.placeId,
      permitStackContractorId: result.placeId,
    });

    annotated.push({
      ...result,
      alreadySaved: !!match,
      matchedCompanyId: match?.company.id ?? null,
      matchReason: match?.reason ?? null,
    });
  }

  return annotated;
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
