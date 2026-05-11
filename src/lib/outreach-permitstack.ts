import "server-only";

const PERMITSTACK_API_BASE = "https://api.permit-stack.com";
export const PERMITSTACK_PAGE_SIZE = "20";

export type PermitStackSearchMode =
  | "contractors_by_name"
  | "derived_from_permits";

export type PermitStackProspectSourceKind =
  | "named_contractor"
  | "fallback_description"
  | "fallback_address";

export type PermitStackSearchInput = {
  searchType: "area" | "contractor";
  city?: string;
  state?: string;
  jurisdiction?: string;
  contractorName?: string;
  category?: string;
  zipCode?: string;
  keyword?: string;
  filedAfter?: string;
  filedBefore?: string;
  issuedAfter?: string;
  issuedBefore?: string;
};

export type PermitStackSearchAttemptDiagnostic = {
  query: string;
  permitTotal: number;
  permitRowsReturned: number;
  contractorRowsDerived: number;
};

type PermitStackContractorSummary = {
  id: string;
  name: string;
  city?: string | null;
  state?: string | null;
  total_permits?: number;
  first_permit_date?: string | null;
  last_permit_date?: string | null;
  specialties?: string[] | null;
};

type PermitStackPermitSummary = {
  id: string;
  contractor_name?: string | null;
  address_street?: string | null;
  address_city?: string | null;
  address_state?: string | null;
  description_raw?: string | null;
  date_issued?: string | null;
  date_filed?: string | null;
  jurisdiction_name?: string | null;
};

type PermitStackSearchResponse<T> = {
  total?: number;
  page?: number;
  per_page?: number;
  results?: T[];
};

export type PermitStackContractorResult = {
  placeId: string;
  name: string;
  address: string;
  rating: null;
  userRatingsTotal: number;
  city: string | null;
  state: string | null;
  permitCount: number | null;
  lastPermitDate: string | null;
  specialties: string[];
  jurisdiction: string | null;
  sourceKind?: PermitStackProspectSourceKind;
  matchConfidence?: number;
};

type CoverageJurisdiction = {
  name?: string;
  city?: string;
  state?: string;
};

let coverageCache: {
  expiresAt: number;
  jurisdictions: CoverageJurisdiction[];
} | null = null;

function normalizeCategory(category?: string) {
  const value = category?.trim().toLowerCase();
  if (!value || value === "all") {
    return null;
  }

  return value;
}

function formatAttemptedQuery(path: string, params: Record<string, string>) {
  const parts = Object.entries(params)
    .filter(([, value]) => value)
    .map(([key, value]) => `${key}=${value}`);

  return `${path} ${parts.join(", ")}`.trim();
}

export function buildPermitStackPermitParams(
  input: PermitStackSearchInput,
  options?: {
    includeJurisdiction?: boolean;
    includeCategory?: boolean;
    jurisdictionOnly?: boolean;
  }
) {
  const params: Record<string, string> = {};
  const city = input.city?.trim();
  const state = input.state?.trim().toUpperCase();
  const zipCode = input.zipCode?.trim();
  const keyword = input.keyword?.trim();
  const contractorName = input.contractorName?.trim();
  const filedAfter = input.filedAfter?.trim();
  const filedBefore = input.filedBefore?.trim();
  const issuedAfter = input.issuedAfter?.trim();
  const issuedBefore = input.issuedBefore?.trim();
  const category =
    options?.includeCategory === false ? null : normalizeCategory(input.category);

  if (!options?.jurisdictionOnly && city) {
    params.city = city;
  }

  if (state) {
    params.state = state;
  }

  if (!options?.jurisdictionOnly && zipCode) {
    params.zip_code = zipCode;
  }

  if (options?.includeJurisdiction && input.jurisdiction?.trim()) {
    params.jurisdiction = input.jurisdiction.trim();
  }

  if (category) {
    params.category = category;
  }

  if (!options?.jurisdictionOnly && keyword) {
    params.q = keyword;
  }

  if (contractorName) {
    params.contractor_name = contractorName;
  }

  if (filedAfter) {
    params.filed_after = filedAfter;
  }

  if (filedBefore) {
    params.filed_before = filedBefore;
  }

  if (issuedAfter) {
    params.issued_after = issuedAfter;
  }

  if (issuedBefore) {
    params.issued_before = issuedBefore;
  }

  return params;
}

export function parsePermitStackQueryLocally(text: string): {
  input: PermitStackSearchInput;
  rationale: string;
} | null {
  const trimmed = text.trim();
  if (!trimmed) {
    return null;
  }

  const cityStateComma = trimmed.match(/^([^,]+),\s*([A-Za-z]{2})$/);
  if (cityStateComma) {
    const city = cityStateComma[1].replace(/\s+city$/i, "").trim();
    const state = cityStateComma[2].toUpperCase();

    return {
      input: {
        searchType: "area",
        city,
        state,
        category: "solar",
      },
      rationale: `Parsed "${city}, ${state}" as an area search.`,
    };
  }

  const cityStateSpace = trimmed.match(/^(.+?)\s+([A-Za-z]{2})$/);
  if (cityStateSpace) {
    const city = cityStateSpace[1].replace(/\s+city$/i, "").trim();
    const state = cityStateSpace[2].toUpperCase();

    return {
      input: {
        searchType: "area",
        city,
        state,
        category: "solar",
      },
      rationale: `Parsed "${city}, ${state}" as an area search.`,
    };
  }

  const cityOnly = trimmed.replace(/\s+city$/i, "").trim();
  if (cityOnly && !cityOnly.includes(",") && cityOnly.split(/\s+/).length <= 2) {
    return {
      input: {
        searchType: "area",
        city: cityOnly,
        category: "solar",
      },
      rationale: `Parsed "${cityOnly}" as the city for an area search.`,
    };
  }

  return null;
}

export function sanitizePermitStackJurisdiction(
  jurisdiction: string | undefined,
  coverage: CoverageJurisdiction[]
) {
  const value = jurisdiction?.trim();
  if (!value) {
    return undefined;
  }

  return jurisdictionMatchesCoverage(value, coverage) ? value : undefined;
}

async function fetchPermitStack(
  path: string,
  params: Record<string, string>,
  apiKey: string
) {
  const url = new URL(`${PERMITSTACK_API_BASE}${path}`);
  for (const [key, value] of Object.entries(params)) {
    if (value) {
      url.searchParams.set(key, value);
    }
  }

  const response = await fetch(url.toString(), {
    headers: {
      "X-API-Key": apiKey,
    },
  });

  const text = await response.text();
  let data: unknown = null;

  if (text) {
    try {
      data = JSON.parse(text);
    } catch {
      if (!response.ok) {
        return {
          error: `PermitStack error: ${response.status} ${response.statusText}`,
        };
      }

      return { error: "PermitStack returned an invalid response." };
    }
  }

  if (!response.ok) {
    const payload = data as {
      message?: string;
      error?: string | { description?: string; message?: string };
    } | null;
    const nestedError = payload?.error;
    const message =
      payload?.message ||
      (typeof nestedError === "string"
        ? nestedError
        : nestedError?.description || nestedError?.message) ||
      response.statusText;

    return { error: `PermitStack error: ${message}` };
  }

  return { data };
}

function getPermitStackResults<T>(data: unknown): T[] {
  const payload = data as PermitStackSearchResponse<T> | null;
  if (!payload || !Array.isArray(payload.results)) {
    return [];
  }

  return payload.results;
}

function getPermitStackTotal(data: unknown) {
  const payload = data as PermitStackSearchResponse<unknown> | null;
  return payload?.total ?? 0;
}

function mapPermitStackContractor(
  contractor: PermitStackContractorSummary
): PermitStackContractorResult {
  return {
    placeId: contractor.id,
    name: contractor.name,
    address: "",
    rating: null,
    userRatingsTotal: 0,
    city: contractor.city || null,
    state: contractor.state || null,
    permitCount: contractor.total_permits ?? null,
    lastPermitDate: contractor.last_permit_date || null,
    specialties: contractor.specialties || [],
    jurisdiction: null,
    sourceKind: "named_contractor",
    matchConfidence: 1,
  };
}

function formatPermitAddress(permit: PermitStackPermitSummary) {
  return [permit.address_street, permit.address_city, permit.address_state]
    .filter(Boolean)
    .join(", ");
}

function deriveProspectFromPermit(permit: PermitStackPermitSummary) {
  const contractorName = permit.contractor_name?.trim();
  if (contractorName) {
    return {
      name: contractorName,
      sourceKind: "named_contractor" as const,
      matchConfidence: 1,
      key: contractorName.toLowerCase(),
    };
  }

  const description = permit.description_raw?.trim();
  if (description) {
    const compact = description.replace(/\s+/g, " ").slice(0, 120).trim();
    if (compact) {
      return {
        name: compact,
        sourceKind: "fallback_description" as const,
        matchConfidence: 0.5,
        key: `description-${permit.id}`,
      };
    }
  }

  const address = formatPermitAddress(permit);
  return {
    name: address ? `Permit applicant at ${address}` : `Permit applicant ${permit.id}`,
    sourceKind: "fallback_address" as const,
    matchConfidence: 0.3,
    key: `address-${permit.id}`,
  };
}

function contractorsFromPermits(
  permits: PermitStackPermitSummary[]
): PermitStackContractorResult[] {
  const byKey = new Map<string, PermitStackContractorResult>();

  for (const permit of permits) {
    const prospect = deriveProspectFromPermit(permit);
    const permitDate = permit.date_issued || permit.date_filed || null;
    const existing = byKey.get(prospect.key);

    if (!existing) {
      byKey.set(prospect.key, {
        placeId: `permit-${prospect.key}`,
        name: prospect.name,
        address: permit.address_street || "",
        rating: null,
        userRatingsTotal: 0,
        city: permit.address_city || null,
        state: permit.address_state || null,
        permitCount: 1,
        lastPermitDate: permitDate,
        specialties: [],
        jurisdiction: permit.jurisdiction_name || null,
        sourceKind: prospect.sourceKind,
        matchConfidence: prospect.matchConfidence,
      });
      continue;
    }

    existing.permitCount = (existing.permitCount || 0) + 1;
    if (
      permitDate &&
      (!existing.lastPermitDate || String(permitDate) > String(existing.lastPermitDate))
    ) {
      existing.lastPermitDate = permitDate;
    }

    if (permit.jurisdiction_name && !existing.jurisdiction) {
      existing.jurisdiction = permit.jurisdiction_name;
    }
  }

  return Array.from(byKey.values());
}

async function searchPermitStackContractors(
  params: Record<string, string>,
  apiKey: string
) {
  const response = await fetchPermitStack(
    "/v1/contractors/search",
    {
      per_page: PERMITSTACK_PAGE_SIZE,
      ...params,
    },
    apiKey
  );

  if (response.error) {
    return { error: response.error };
  }

  return {
    results: getPermitStackResults<PermitStackContractorSummary>(response.data).map(
      mapPermitStackContractor
    ),
  };
}

async function searchPermitStackPermits(
  params: Record<string, string>,
  apiKey: string
) {
  const response = await fetchPermitStack(
    "/v1/permits/search",
    {
      per_page: PERMITSTACK_PAGE_SIZE,
      ...params,
    },
    apiKey
  );

  if (response.error) {
    return { error: response.error };
  }

  const permits = getPermitStackResults<PermitStackPermitSummary>(response.data);
  const results = contractorsFromPermits(permits);

  return {
    results,
    permitTotal: getPermitStackTotal(response.data),
    permitRowsReturned: permits.length,
    contractorRowsDerived: results.length,
  };
}

function getPermitStackCoverageJurisdictions(data: unknown) {
  if (!data || typeof data !== "object") {
    return [] as CoverageJurisdiction[];
  }

  const payload = data as {
    results?: CoverageJurisdiction[];
    jurisdictions?: CoverageJurisdiction[];
  };

  if (Array.isArray(payload.results)) {
    return payload.results;
  }

  if (Array.isArray(payload.jurisdictions)) {
    return payload.jurisdictions;
  }

  return getPermitStackResults<CoverageJurisdiction>(data);
}

export async function loadPermitStackCoverage(apiKey: string) {
  if (coverageCache && coverageCache.expiresAt > Date.now()) {
    return coverageCache.jurisdictions;
  }

  const response = await fetchPermitStack("/v1/permits/stats/coverage", {}, apiKey);
  if (response.error || !response.data) {
    return [];
  }

  const jurisdictions = getPermitStackCoverageJurisdictions(response.data);
  coverageCache = {
    expiresAt: Date.now() + 24 * 60 * 60 * 1000,
    jurisdictions,
  };

  return jurisdictions;
}

function jurisdictionMatchesCoverage(
  jurisdiction: string,
  coverage: CoverageJurisdiction[]
) {
  const target = jurisdiction.trim().toLowerCase();

  return coverage.some((entry) => {
    const name = entry.name?.toLowerCase();
    const city = entry.city?.toLowerCase();
    return (
      name === target ||
      city === target ||
      name?.includes(target) ||
      (name ? target.includes(name) : false)
    );
  });
}

export function resolvePermitStackJurisdictions(
  input: Pick<PermitStackSearchInput, "city" | "state" | "jurisdiction">,
  coverage: CoverageJurisdiction[]
) {
  if (input.jurisdiction?.trim()) {
    const jurisdiction = input.jurisdiction.trim();
    if (jurisdictionMatchesCoverage(jurisdiction, coverage)) {
      return [jurisdiction];
    }

    return [];
  }

  if (!input.city?.trim()) {
    return [];
  }

  const cityLower = input.city.trim().toLowerCase();
  const stateLower = input.state?.trim().toLowerCase();

  const matches = coverage.filter((jurisdiction) => {
    const jurisdictionCity = jurisdiction.city?.toLowerCase();
    const jurisdictionName = jurisdiction.name?.toLowerCase();
    const jurisdictionState = jurisdiction.state?.toLowerCase();
    const cityMatches =
      jurisdictionCity === cityLower ||
      jurisdictionName === cityLower ||
      jurisdictionName?.startsWith(`${cityLower} `) ||
      jurisdictionName?.includes(cityLower);
    const stateMatches = !stateLower || jurisdictionState === stateLower;

    return cityMatches && stateMatches;
  });

  const names = matches
    .map((match) => match.name || match.city)
    .filter((value): value is string => !!value);

  return Array.from(new Set(names));
}

function buildPermitStackEmptyMessage(
  input: PermitStackSearchInput,
  coverage: CoverageJurisdiction[],
  attemptDiagnostics: PermitStackSearchAttemptDiagnostic[]
) {
  if (input.searchType === "contractor") {
    return `No PermitStack contractors matched "${input.contractorName || ""}". Try a broader contractor name or switch to permit search with city, state, and category filters.`;
  }

  const locationLabel = `${input.city || ""}${input.state ? `, ${input.state}` : ""}`.trim();
  const coverageMatches = resolvePermitStackJurisdictions(input, coverage);
  const categoryLabel = normalizeCategory(input.category) || "all categories";
  const totals = attemptDiagnostics.reduce(
    (summary, attempt) => ({
      permitTotal: Math.max(summary.permitTotal, attempt.permitTotal),
      permitRowsReturned: Math.max(summary.permitRowsReturned, attempt.permitRowsReturned),
      contractorRowsDerived: Math.max(
        summary.contractorRowsDerived,
        attempt.contractorRowsDerived
      ),
    }),
    { permitTotal: 0, permitRowsReturned: 0, contractorRowsDerived: 0 }
  );

  const attemptSummary = attemptDiagnostics
    .map(
      (attempt) =>
        `${attempt.query} (permits total ${attempt.permitTotal}, rows ${attempt.permitRowsReturned}, prospects ${attempt.contractorRowsDerived})`
    )
    .join("; ");

  if (totals.permitTotal === 0) {
    const coverageHint =
      coverageMatches.length > 0
        ? ` PermitStack coverage includes ${coverageMatches.join(", ")}.`
        : "";

    return `PermitStack returned no permit rows for ${locationLabel || "that search"} with ${categoryLabel}.${coverageHint} Attempted: ${attemptSummary}. Try category=all, a keyword, ZIP code, filed-after date, or contractor-name search.`;
  }

  if (totals.contractorRowsDerived === 0) {
    return `PermitStack returned ${totals.permitTotal} matching permits, but none could be turned into saveable contractor prospects.${coverageMatches.length ? ` Coverage: ${coverageMatches.join(", ")}.` : ""} Attempted: ${attemptSummary}. Try contractor-name search or broaden filters.`;
  }

  return `No saveable contractor prospects matched for ${categoryLabel}. Attempted: ${attemptSummary}.`;
}

async function runPermitSearchAttempt(
  params: Record<string, string>,
  apiKey: string,
  attemptDiagnostics: PermitStackSearchAttemptDiagnostic[]
): Promise<{ error: string } | { results: PermitStackContractorResult[] }> {
  const query = formatAttemptedQuery("permits/search", params);
  const search = await searchPermitStackPermits(params, apiKey);
  if (search.error) {
    return { error: search.error as string };
  }

  const results = search.results ?? [];

  attemptDiagnostics.push({
    query,
    permitTotal: search.permitTotal ?? 0,
    permitRowsReturned: search.permitRowsReturned ?? 0,
    contractorRowsDerived: search.contractorRowsDerived ?? 0,
  });

  return { results };
}

export async function runPermitStackSearch(
  input: PermitStackSearchInput,
  apiKey: string
) {
  const attemptDiagnostics: PermitStackSearchAttemptDiagnostic[] = [];
  const coverage = await loadPermitStackCoverage(apiKey);

  if (input.searchType === "contractor") {
    const contractorName = input.contractorName?.trim();
    if (!contractorName) {
      return { error: "Enter a contractor name for PermitStack name search." };
    }

    const category = normalizeCategory(input.category);
    const contractorParams: Record<string, string> = {
      name: contractorName,
    };

    if (category) {
      contractorParams.specialty = category;
    }

    if (input.city?.trim()) {
      contractorParams.city = input.city.trim();
    }

    if (input.state?.trim()) {
      contractorParams.state = input.state.trim().toUpperCase();
    }

    const contractorSearch = await searchPermitStackContractors(contractorParams, apiKey);
    if (contractorSearch.error) {
      return { error: contractorSearch.error };
    }

    const contractorResults = contractorSearch.results ?? [];
    if (contractorResults.length > 0) {
      return {
        results: contractorResults,
        searchMode: "contractors_by_name" as PermitStackSearchMode,
        resolvedJurisdiction: input.jurisdiction || null,
        attemptDiagnostics,
        message: null,
      };
    }

    const permitParams = buildPermitStackPermitParams(
      {
        ...input,
        contractorName,
      },
      { includeJurisdiction: !!input.jurisdiction?.trim() }
    );

    const permitAttempt = await runPermitSearchAttempt(
      permitParams,
      apiKey,
      attemptDiagnostics
    );
    if ("error" in permitAttempt) {
      return { error: permitAttempt.error };
    }

    if (permitAttempt.results.length > 0) {
      return {
        results: permitAttempt.results,
        searchMode: "derived_from_permits" as PermitStackSearchMode,
        resolvedJurisdiction: input.jurisdiction || null,
        attemptDiagnostics,
        message: null,
      };
    }

    return {
      results: [],
      searchMode: "contractors_by_name" as PermitStackSearchMode,
      resolvedJurisdiction: input.jurisdiction || null,
      attemptDiagnostics,
      message: buildPermitStackEmptyMessage(input, coverage, attemptDiagnostics),
    };
  }

  const city = input.city?.trim();
  const zipCode = input.zipCode?.trim();
  const keyword = input.keyword?.trim();
  const jurisdiction = input.jurisdiction?.trim();

  if (!city && !zipCode && !keyword && !jurisdiction) {
    return {
      error:
        "Enter at least one PermitStack area filter: city, ZIP code, keyword, or jurisdiction.",
    };
  }

  const resolvedJurisdictions = resolvePermitStackJurisdictions(input, coverage);
  const resolvedJurisdiction = jurisdiction || resolvedJurisdictions[0] || null;
  const category = normalizeCategory(input.category);
  let searchCalls = 0;

  const primaryParams = buildPermitStackPermitParams(input, {
    includeJurisdiction: !!jurisdiction,
    includeCategory: true,
  });
  const primaryAttempt = await runPermitSearchAttempt(
    primaryParams,
    apiKey,
    attemptDiagnostics
  );
  searchCalls += 1;

  if ("error" in primaryAttempt) {
    return { error: primaryAttempt.error };
  }

  if (primaryAttempt.results.length > 0) {
    return {
      results: primaryAttempt.results,
      searchMode: "derived_from_permits" as PermitStackSearchMode,
      resolvedJurisdiction,
      attemptDiagnostics,
      message: null,
    };
  }

  const primaryDiagnostic = attemptDiagnostics[attemptDiagnostics.length - 1];

  if (searchCalls < 2) {
    let secondaryParams: Record<string, string> | null = null;
    let secondaryResolvedJurisdiction = resolvedJurisdiction;

    if (
      !jurisdiction &&
      resolvedJurisdictions[0] &&
      primaryDiagnostic?.permitTotal === 0
    ) {
      secondaryParams = buildPermitStackPermitParams(
        {
          ...input,
          jurisdiction: resolvedJurisdictions[0],
        },
        {
          includeJurisdiction: true,
          includeCategory: false,
          jurisdictionOnly: true,
        }
      );
      secondaryResolvedJurisdiction = resolvedJurisdictions[0];
    } else if (category) {
      secondaryParams = buildPermitStackPermitParams(input, {
        includeJurisdiction: !!jurisdiction,
        includeCategory: false,
      });
    } else if (!jurisdiction && resolvedJurisdictions[0]) {
      secondaryParams = buildPermitStackPermitParams(
        {
          ...input,
          jurisdiction: resolvedJurisdictions[0],
        },
        {
          includeJurisdiction: true,
          includeCategory: false,
          jurisdictionOnly: true,
        }
      );
      secondaryResolvedJurisdiction = resolvedJurisdictions[0];
    }

    if (secondaryParams) {
      const secondaryAttempt = await runPermitSearchAttempt(
        secondaryParams,
        apiKey,
        attemptDiagnostics
      );
      searchCalls += 1;

      if ("error" in secondaryAttempt) {
        return { error: secondaryAttempt.error };
      }

      if (secondaryAttempt.results.length > 0) {
        return {
          results: secondaryAttempt.results,
          searchMode: "derived_from_permits" as PermitStackSearchMode,
          resolvedJurisdiction: secondaryResolvedJurisdiction,
          attemptDiagnostics,
          message: null,
        };
      }
    }
  }

  return {
    results: [],
    searchMode: "derived_from_permits" as PermitStackSearchMode,
    resolvedJurisdiction,
    attemptDiagnostics,
    message: buildPermitStackEmptyMessage(input, coverage, attemptDiagnostics),
  };
}
