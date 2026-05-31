import "server-only";

import { normalizeCompanyName } from "@/lib/outreach-search";
import type { OutreachEnrichmentSnapshot } from "@/lib/outreach-signals";

export type YelpBusinessCandidate = {
  id: string;
  name: string;
  rating: number | null;
  reviewCount: number | null;
  isClosed: boolean;
  city: string | null;
  state: string | null;
  address: string | null;
  confidence: number;
};

type YelpBusiness = {
  id: string;
  name: string;
  rating?: number;
  review_count?: number;
  is_closed?: boolean;
  location?: {
    address1?: string;
    city?: string;
    state?: string;
  };
};

export type YelpSignalResult = {
  snapshot: Partial<OutreachEnrichmentSnapshot>;
  candidates?: YelpBusinessCandidate[];
  requiresSelection?: boolean;
  message?: string;
  error?: string;
};

export function extractAddressLineFromNotes(notes?: string | null) {
  if (!notes) {
    return null;
  }
  const match = notes.match(/^Address:\s*(.+)$/m);
  return match?.[1]?.trim() || null;
}

export function scoreYelpCandidate(
  company: {
    name: string;
    city?: string | null;
    state?: string | null;
  },
  candidate: YelpBusiness
): number {
  const companyName = normalizeCompanyName(company.name);
  const candidateName = normalizeCompanyName(candidate.name);
  let score = 0;

  if (companyName && candidateName && companyName === candidateName) {
    score += 0.55;
  } else if (
    companyName &&
    candidateName &&
    (companyName.includes(candidateName) || candidateName.includes(companyName))
  ) {
    score += 0.3;
  }

  if (
    company.city &&
    candidate.location?.city &&
    company.city.toLowerCase() === candidate.location.city.toLowerCase()
  ) {
    score += 0.2;
  }

  if (
    company.state &&
    candidate.location?.state &&
    company.state.toLowerCase() === candidate.location.state.toLowerCase()
  ) {
    score += 0.15;
  }

  return Math.min(score, 1);
}

export function mapYelpCandidate(
  business: YelpBusiness,
  confidence: number
): YelpBusinessCandidate {
  return {
    id: business.id,
    name: business.name,
    rating: business.rating ?? null,
    reviewCount: business.review_count ?? null,
    isClosed: !!business.is_closed,
    city: business.location?.city || null,
    state: business.location?.state || null,
    address: business.location?.address1 || null,
    confidence,
  };
}

export async function fetchYelpBusinessDetails(apiKey: string, businessId: string) {
  const response = await fetch(`https://api.yelp.com/v3/businesses/${businessId}`, {
    headers: {
      Authorization: `Bearer ${apiKey}`,
    },
  });
  const data = await response.json();
  if (!response.ok) {
    return {
      error: `Yelp error: ${data.error?.description || response.statusText}`,
    };
  }
  return { business: data as YelpBusiness };
}

export async function fetchYelpReviewSnippets(
  apiKey: string,
  businessId: string,
  limit = 3
): Promise<string[]> {
  try {
    const reviewsResponse = await fetch(
      `https://api.yelp.com/v3/businesses/${businessId}/reviews?limit=${limit}&sort_by=newest`,
      {
        headers: {
          Authorization: `Bearer ${apiKey}`,
        },
      }
    );
    if (!reviewsResponse.ok) {
      return [];
    }
    const reviewsData = await reviewsResponse.json();
    return (reviewsData.reviews || [])
      .map((review: { text?: string; rating?: number }) => {
        if (!review.text) return "";
        const stars = review.rating ? `${review.rating} stars` : "";
        return stars
          ? `[${stars}] ${String(review.text).replace(/\n/g, " ").slice(0, 280)}`
          : String(review.text).replace(/\n/g, " ").slice(0, 280);
      })
      .filter(Boolean);
  } catch {
    return [];
  }
}

function buildYelpSnapshot(
  business: YelpBusiness,
  confidence: number,
  reviewSnippets: string[]
): Partial<OutreachEnrichmentSnapshot> {
  return {
    yelp: {
      businessId: business.id,
      businessName: business.name,
      rating: business.rating ?? null,
      reviewCount: business.review_count ?? null,
      isClosed: !!business.is_closed,
      reviewSnippets,
      matchConfidence: confidence,
    },
    yelpBusinessId: business.id,
    yelpMatchConfidence: confidence,
    yelpBusinessName: business.name,
  };
}

async function searchYelpCandidates(
  apiKey: string,
  company: {
    name: string;
    city?: string | null;
    state?: string | null;
    notes?: string | null;
  }
): Promise<YelpBusinessCandidate[]> {
  const addressLine = extractAddressLineFromNotes(company.notes);
  let candidates: YelpBusinessCandidate[] = [];

  if (addressLine) {
    const matchUrl = new URL("https://api.yelp.com/v3/businesses/matches");
    matchUrl.searchParams.set("name", company.name);
    matchUrl.searchParams.set("address1", addressLine);
    if (company.city) matchUrl.searchParams.set("city", company.city);
    if (company.state) matchUrl.searchParams.set("state", company.state);
    matchUrl.searchParams.set("country", "US");

    const matchResponse = await fetch(matchUrl.toString(), {
      headers: { Authorization: `Bearer ${apiKey}` },
    });
    const matchData = await matchResponse.json();
    if (matchResponse.ok && Array.isArray(matchData.businesses)) {
      candidates = matchData.businesses.map((business: YelpBusiness) =>
        mapYelpCandidate(business, scoreYelpCandidate(company, business))
      );
    }
  }

  if (candidates.length === 0) {
    const searchResponse = await fetch(
      `https://api.yelp.com/v3/businesses/search?term=${encodeURIComponent(company.name)}&location=${encodeURIComponent(`${company.city || ""}, ${company.state || ""}`)}&limit=5`,
      { headers: { Authorization: `Bearer ${apiKey}` } }
    );
    const searchData = await searchResponse.json();
    if (searchResponse.ok) {
      candidates = (searchData.businesses || []).map((business: YelpBusiness) =>
        mapYelpCandidate(business, scoreYelpCandidate(company, business))
      );
    }
  }

  candidates.sort((left, right) => right.confidence - left.confidence);
  return candidates;
}

export async function fetchYelpSignalsForCompany(input: {
  name: string;
  city?: string | null;
  state?: string | null;
  notes?: string | null;
  selectedBusinessId?: string;
}): Promise<YelpSignalResult> {
  const apiKey = process.env.YELP_API_KEY;
  if (!apiKey) {
    return { snapshot: {}, error: "Yelp API key not configured." };
  }

  try {
    if (input.selectedBusinessId) {
      const details = await fetchYelpBusinessDetails(apiKey, input.selectedBusinessId);
      if (details.error || !details.business) {
        return { snapshot: {}, error: details.error || "Yelp business not found." };
      }
      const reviewSnippets = await fetchYelpReviewSnippets(apiKey, input.selectedBusinessId);
      return {
        snapshot: buildYelpSnapshot(details.business, 1, reviewSnippets),
      };
    }

    const candidates = await searchYelpCandidates(apiKey, input);
    if (candidates.length === 0) {
      return { snapshot: {}, error: "No matching business found on Yelp." };
    }

    const best = candidates[0];
    if (best.confidence < 0.75) {
      return {
        snapshot: {},
        requiresSelection: true,
        candidates: candidates.slice(0, 3),
        message: "Multiple Yelp matches found. Select the correct business.",
      };
    }

    const details = await fetchYelpBusinessDetails(apiKey, best.id);
    if (details.error || !details.business) {
      return { snapshot: {}, error: details.error || "Yelp business not found." };
    }

    const reviewSnippets = await fetchYelpReviewSnippets(apiKey, best.id);
    return {
      snapshot: buildYelpSnapshot(details.business, best.confidence, reviewSnippets),
    };
  } catch (error) {
    console.error("Yelp signal fetch failed:", error);
    return { snapshot: {}, error: "Failed to enrich with Yelp." };
  }
}
