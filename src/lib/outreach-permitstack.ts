import "server-only";

const PERMITSTACK_API_BASE = "https://api.permit-stack.com";
export const PERMITSTACK_PAGE_SIZE = "20";

export type PermitStackSearchMode =
  | "contractors_by_area"
  | "contractors_by_name"
  | "derived_from_permits";

export type PermitStackSearchInput = {
  searchType: "area" | "contractor";
  city?: string;
  state?: string;
  jurisdiction?: string;
  contractorName?: string;
  category?: string;
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

export function resolvePermitStackJurisdictions(
  input: Pick<PermitStackSearchInput, "city" | "state" | "jurisdiction">,
  coverage: CoverageJurisdiction[]
) {
  if (input.jurisdiction?.trim()) {
    return [input.jurisdiction.trim()];
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
      jurisdictionName?.includes(cityLower) ||
      jurisdictionName === cityLower;
    const stateMatches = !stateLower || jurisdictionState === stateLower;

    return cityMatches && stateMatches;
  });

  const names = matches
    .map((match) => match.name || match.city)
    .filter((value): value is string => !!value);

  if (names.length > 0) {
    return Array.from(new Set(names));
  }

  return [input.city.trim()];
}

function buildPermitStackEmptyMessage(
  input: PermitStackSearchInput,
  coverage: CoverageJurisdiction[],
  attempted: string[]
) {
  if (input.searchType === "contractor") {
    return `No PermitStack contractors matched "${input.contractorName || ""}". Try a broader contractor name or switch to area search with city and state.`;
  }

  const locationLabel = `${input.city || ""}${input.state ? `, ${input.state}` : ""}`.trim();
  const coverageMatches = resolvePermitStackJurisdictions(input, coverage);
  const attemptedSummary = attempted.length
    ? ` Attempted: ${attempted.join("; ")}.`
    : "";

  if (coverageMatches.length === 0) {
    return `No PermitStack coverage found for ${locationLabel || "that location"}. Try another covered city/state or search by contractor name.${attemptedSummary}`;
  }

  return `${locationLabel || "This area"} is in PermitStack coverage (${coverageMatches.join(", ")}), but no solar contractors matched.${attemptedSummary} Try adding a state code, selecting a jurisdiction, or searching by contractor name.`;
}

export async function runPermitStackSearch(
  input: PermitStackSearchInput,
  apiKey: string
) {
  const category = input.category?.trim() || "solar";
  const attempted: string[] = [];
  const coverage = await loadPermitStackCoverage(apiKey);

  if (input.searchType === "contractor") {
    const contractorName = input.contractorName?.trim();
    if (!contractorName) {
      return { error: "Enter a contractor name for PermitStack name search." };
    }

    const params: Record<string, string> = {
      name: contractorName,
      specialty: category,
    };

    if (input.city?.trim()) {
      params.city = input.city.trim();
    }

    if (input.state?.trim()) {
      params.state = input.state.trim().toUpperCase();
    }

    attempted.push(`contractors/search name=${contractorName}, specialty=${category}`);
    const contractorSearch = await searchPermitStackContractors(params, apiKey);
    if (contractorSearch.error) {
      return { error: contractorSearch.error };
    }

    const results = contractorSearch.results ?? [];
    if (results.length > 0) {
      return {
        results,
        searchMode: "contractors_by_name" as PermitStackSearchMode,
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
  if (!city) {
    return { error: "Enter a city for PermitStack area search." };
  }

  const state = input.state?.trim().toUpperCase();
  const jurisdictions = resolvePermitStackJurisdictions(input, coverage);
  const resolvedJurisdiction = jurisdictions[0] || input.jurisdiction || city;

  const contractorParams: Record<string, string> = {
    city,
    specialty: category,
  };

  if (state) {
    contractorParams.state = state;
  }

  attempted.push(`contractors/search city=${city}, specialty=${category}`);
  const contractorSearch = await searchPermitStackContractors(contractorParams, apiKey);
  if (contractorSearch.error) {
    return { error: contractorSearch.error };
  }

  const areaContractors = contractorSearch.results ?? [];
  if (areaContractors.length > 0) {
    return {
      results: areaContractors,
      searchMode: "contractors_by_area" as PermitStackSearchMode,
      resolvedJurisdiction,
      attempted,
      message: null,
    };
  }

  const permitParams: Record<string, string> = {
    city,
    category,
    jurisdiction: resolvedJurisdiction,
  };

  if (state) {
    permitParams.state = state;
  }

  attempted.push(
    `permits/search city=${city}, category=${category}, jurisdiction=${resolvedJurisdiction}`
  );
  const permitSearch = await searchPermitStackPermits(permitParams, apiKey);
  if (permitSearch.error) {
    return { error: permitSearch.error };
  }

  const derivedContractors = permitSearch.results ?? [];
  if (derivedContractors.length > 0) {
    return {
      results: derivedContractors,
      searchMode: "derived_from_permits" as PermitStackSearchMode,
      resolvedJurisdiction,
      attempted,
      message: null,
    };
  }

  return {
    results: [],
    searchMode: "contractors_by_area" as PermitStackSearchMode,
    resolvedJurisdiction,
    attempted,
    message: buildPermitStackEmptyMessage(input, coverage, attempted),
  };
}
