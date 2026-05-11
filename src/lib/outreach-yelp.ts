import "server-only";

import { normalizeCompanyName } from "@/lib/outreach-search";

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
