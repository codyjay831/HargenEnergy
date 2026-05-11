import "server-only";

const PERMITSTACK_API_BASE = "https://api.permit-stack.com";
export const PERMITSTACK_PAGE_SIZE = "20";

export type PermitStackSearchMode =
  | "contractors_by_name"
  | "derived_from_permits";

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
  options?: { includeJurisdiction?: boolean; includeCategory?: boolean }
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

  if (city) {
    params.city = city;
  }

  if (state) {
    params.state = state;
  }

  if (zipCode) {
    params.zip_code = zipCode;
  }

  if (options?.includeJurisdiction && input.jurisdiction?.trim()) {
    params.jurisdiction = input.jurisdiction.trim();
  }

  if (category) {
    params.category = category;
  }

  if (keyword) {
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
  };
}

function contractorsFromPermits(
  permits: PermitStackPermitSummary[]
): PermitStackContractorResult[] {
  const byKey = new Map<string, PermitStackContractorResult>();

  for (const permit of permits) {
    const name = permit.contractor_name?.trim();
    if (!name) {
      continue;
    }

    const key = name.toLowerCase();
    const permitDate = permit.date_issued || permit.date_filed || null;
    const existing = byKey.get(key);

    if (!existing) {
      byKey.set(key, {
        placeId: `permit-${key}`,
        name,
        address: permit.address_street || "",
        rating: null,
        userRatingsTotal: 0,
        city: permit.address_city || null,
        state: permit.address_state || null,
        permitCount: 1,
        lastPermitDate: permitDate,
        specialties: [],
        jurisdiction: permit.jurisdiction_name || null,
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

  return {
    results: contractorsFromPermits(
      getPermitStackResults<PermitStackPermitSummary>(response.data)
    ),
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

async function loadPermitStackCoverage(apiKey: string) {
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
  attempted: string[]
) {
  if (input.searchType === "contractor") {
    return `No PermitStack contractors matched "${input.contractorName || ""}". Try a broader contractor name or switch to permit search with city, state, and category filters.`;
  }

  const locationLabel = `${input.city || ""}${input.state ? `, ${input.state}` : ""}`.trim();
  const coverageMatches = resolvePermitStackJurisdictions(input, coverage);
  const attemptedSummary = attempted.length
    ? ` Attempted: ${attempted.join("; ")}.`
    : "";
  const categoryLabel = normalizeCategory(input.category) || "all categories";

  if (coverageMatches.length === 0) {
    return `No PermitStack coverage found for ${locationLabel || "that location"}. Try another covered city/state, add a ZIP or keyword, or search by contractor name.${attemptedSummary}`;
  }

  return `${locationLabel || "This area"} is in PermitStack coverage (${coverageMatches.join(", ")}), but no contractors matched for ${categoryLabel}.${attemptedSummary} Try category=all, a keyword, ZIP code, filed-after date, or contractor-name search.`;
}

export async function runPermitStackSearch(
  input: PermitStackSearchInput,
  apiKey: string
) {
  const attempted: string[] = [];
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

    attempted.push(formatAttemptedQuery("contractors/search", contractorParams));
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
        attempted,
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

    attempted.push(formatAttemptedQuery("permits/search", permitParams));
    const permitSearch = await searchPermitStackPermits(permitParams, apiKey);
    if (permitSearch.error) {
      return { error: permitSearch.error };
    }

    const permitResults = permitSearch.results ?? [];
    if (permitResults.length > 0) {
      return {
        results: permitResults,
        searchMode: "derived_from_permits" as PermitStackSearchMode,
        resolvedJurisdiction: input.jurisdiction || null,
        attempted,
        message: null,
      };
    }

    return {
      results: [],
      searchMode: "contractors_by_name" as PermitStackSearchMode,
      resolvedJurisdiction: input.jurisdiction || null,
      attempted,
      message: buildPermitStackEmptyMessage(input, coverage, attempted),
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
  attempted.push(formatAttemptedQuery("permits/search", primaryParams));
  const primarySearch = await searchPermitStackPermits(primaryParams, apiKey);
  searchCalls += 1;

  if (primarySearch.error) {
    return { error: primarySearch.error };
  }

  const primaryResults = primarySearch.results ?? [];
  if (primaryResults.length > 0) {
    return {
      results: primaryResults,
      searchMode: "derived_from_permits" as PermitStackSearchMode,
      resolvedJurisdiction,
      attempted,
      message: null,
    };
  }

  if (searchCalls < 2 && category) {
    const broadParams = buildPermitStackPermitParams(input, {
      includeJurisdiction: !!jurisdiction,
      includeCategory: false,
    });
    attempted.push(formatAttemptedQuery("permits/search", broadParams));
    const broadSearch = await searchPermitStackPermits(broadParams, apiKey);
    searchCalls += 1;

    if (broadSearch.error) {
      return { error: broadSearch.error };
    }

    const broadResults = broadSearch.results ?? [];
    if (broadResults.length > 0) {
      return {
        results: broadResults,
        searchMode: "derived_from_permits" as PermitStackSearchMode,
        resolvedJurisdiction,
        attempted,
        message: null,
      };
    }
  }

  if (searchCalls < 2 && !jurisdiction && resolvedJurisdictions[0]) {
    const jurisdictionParams = buildPermitStackPermitParams(
      {
        ...input,
        jurisdiction: resolvedJurisdictions[0],
      },
      {
        includeJurisdiction: true,
        includeCategory: false,
      }
    );
    attempted.push(formatAttemptedQuery("permits/search", jurisdictionParams));
    const jurisdictionSearch = await searchPermitStackPermits(jurisdictionParams, apiKey);
    searchCalls += 1;

    if (jurisdictionSearch.error) {
      return { error: jurisdictionSearch.error };
    }

    const jurisdictionResults = jurisdictionSearch.results ?? [];
    if (jurisdictionResults.length > 0) {
      return {
        results: jurisdictionResults,
        searchMode: "derived_from_permits" as PermitStackSearchMode,
        resolvedJurisdiction: resolvedJurisdictions[0],
        attempted,
        message: null,
      };
    }
  }

  return {
    results: [],
    searchMode: "derived_from_permits" as PermitStackSearchMode,
    resolvedJurisdiction,
    attempted,
    message: buildPermitStackEmptyMessage(input, coverage, attempted),
  };
}
