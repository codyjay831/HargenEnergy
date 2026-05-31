import { OutreachCompanyStatus } from "@/generated/prisma/client";

export type BusinessStatusValue = "active" | "closed" | "temp_closed" | "unknown";

export type OutreachEnrichmentSnapshot = {
  google?: {
    rating?: number | null;
    reviewCount?: number | null;
    businessStatus?: string | null;
    phone?: string | null;
    address?: string | null;
  };
  yelp?: {
    businessId?: string | null;
    rating?: number | null;
    reviewCount?: number | null;
    isClosed?: boolean;
    reviewSnippets?: string[];
    matchConfidence?: number | null;
    businessName?: string | null;
  };
  license?: {
    number?: string | null;
    status?: string | null;
    type?: string | null;
    state?: string | null;
    source?: string | null;
  };
  signals?: {
    businessStatus?: BusinessStatusValue;
    doNotContactReason?: string | null;
  };
  ai?: {
    summary?: string | null;
    topPainPoint?: string | null;
    reviewThemes?: string[];
    outreachAngle?: string | null;
    fitScore?: number | null;
    reviewSummary?: string | null;
  };
  /** Legacy flat fields kept for backward compatibility */
  summary?: string | null;
  topPainPoint?: string | null;
  contacts?: unknown[];
  painPoints?: string[];
  fitScore?: number;
  permitStack?: unknown;
  yelpBusinessId?: string;
  yelpMatchConfidence?: number;
  yelpBusinessName?: string;
};

export function parseEnrichmentSnapshot(
  value: unknown
): OutreachEnrichmentSnapshot | null {
  if (!value || typeof value !== "object") {
    return null;
  }
  return value as OutreachEnrichmentSnapshot;
}

export function mergeEnrichmentSnapshots(
  existing: OutreachEnrichmentSnapshot | null,
  incoming: Partial<OutreachEnrichmentSnapshot>
): OutreachEnrichmentSnapshot {
  return {
    ...existing,
    ...incoming,
    google: { ...existing?.google, ...incoming.google },
    yelp: { ...existing?.yelp, ...incoming.yelp },
    license: { ...existing?.license, ...incoming.license },
    signals: { ...existing?.signals, ...incoming.signals },
    ai: { ...existing?.ai, ...incoming.ai },
  };
}

export function deriveBusinessStatus(input: {
  googleBusinessStatus?: string | null;
  yelpIsClosed?: boolean;
}): BusinessStatusValue {
  if (input.yelpIsClosed) {
    return "closed";
  }
  const google = (input.googleBusinessStatus || "").toUpperCase();
  if (google === "CLOSED_PERMANENTLY") {
    return "closed";
  }
  if (google === "CLOSED_TEMPORARILY") {
    return "temp_closed";
  }
  if (google === "OPERATIONAL") {
    return "active";
  }
  return "unknown";
}

export function applyBusinessStatusSignals(input: {
  businessStatus: BusinessStatusValue;
  doNotContactReason?: string | null;
}) {
  if (input.businessStatus === "closed") {
    return {
      doNotContact: true,
      status: OutreachCompanyStatus.BAD_FIT,
      interestLevel: 0,
      signals: {
        businessStatus: input.businessStatus,
        doNotContactReason:
          input.doNotContactReason || "Business appears permanently closed",
      },
    };
  }

  if (input.businessStatus === "temp_closed") {
    return {
      signals: {
        businessStatus: input.businessStatus,
        doNotContactReason: input.doNotContactReason || "Temporarily closed",
      },
    };
  }

  return {
    signals: {
      businessStatus: input.businessStatus,
      doNotContactReason: null,
    },
  };
}

export function serializeEnrichmentToCsvFields(
  snapshot: OutreachEnrichmentSnapshot | null,
  discovery?: {
    rating?: number | null;
    userRatingsTotal?: number | null;
  } | null
): Record<string, string> {
  const googleRating =
    snapshot?.google?.rating ?? discovery?.rating ?? null;
  const googleReviewCount =
    snapshot?.google?.reviewCount ?? discovery?.userRatingsTotal ?? null;

  const topSnippet =
    snapshot?.yelp?.reviewSnippets?.[0] ||
    snapshot?.ai?.reviewSummary?.split(".")[0] ||
    "";

  return {
    googleRating: googleRating != null ? String(googleRating) : "",
    googleReviewCount: googleReviewCount != null ? String(googleReviewCount) : "",
    yelpRating: snapshot?.yelp?.rating != null ? String(snapshot.yelp.rating) : "",
    yelpReviewCount:
      snapshot?.yelp?.reviewCount != null ? String(snapshot.yelp.reviewCount) : "",
    businessStatus: snapshot?.signals?.businessStatus || "unknown",
    licenseNumber: snapshot?.license?.number || "",
    licenseStatus: snapshot?.license?.status || "",
    reviewSummary: snapshot?.ai?.reviewSummary || "",
    topReviewSnippet: topSnippet,
    outreachAngle:
      snapshot?.ai?.outreachAngle ||
      snapshot?.ai?.topPainPoint ||
      snapshot?.topPainPoint ||
      "",
  };
}

export function parseBusinessStatus(value?: string | null): BusinessStatusValue {
  const normalized = (value || "").trim().toLowerCase();
  if (
    normalized === "active" ||
    normalized === "closed" ||
    normalized === "temp_closed" ||
    normalized === "unknown"
  ) {
    return normalized;
  }
  if (normalized.includes("closed")) {
    return normalized.includes("temp") ? "temp_closed" : "closed";
  }
  return "unknown";
}

export function enrichmentFromCsvRow(row: Record<string, string | undefined>): Partial<OutreachEnrichmentSnapshot> {
  const googleRating = row.googleRating?.trim();
  const googleReviewCount = row.googleReviewCount?.trim();
  const yelpRating = row.yelpRating?.trim();
  const yelpReviewCount = row.yelpReviewCount?.trim();
  const businessStatus = parseBusinessStatus(row.businessStatus);
  const licenseNumber = row.licenseNumber?.trim();
  const licenseStatus = row.licenseStatus?.trim();
  const reviewSummary = row.reviewSummary?.trim();
  const topReviewSnippet = row.topReviewSnippet?.trim();
  const outreachAngle = row.outreachAngle?.trim();

  const snapshot: Partial<OutreachEnrichmentSnapshot> = {};

  if (googleRating || googleReviewCount) {
    snapshot.google = {
      rating: googleRating ? Number.parseFloat(googleRating) : null,
      reviewCount: googleReviewCount ? Number.parseInt(googleReviewCount, 10) : null,
    };
  }

  if (yelpRating || yelpReviewCount || topReviewSnippet) {
    snapshot.yelp = {
      rating: yelpRating ? Number.parseFloat(yelpRating) : null,
      reviewCount: yelpReviewCount ? Number.parseInt(yelpReviewCount, 10) : null,
      reviewSnippets: topReviewSnippet ? [topReviewSnippet] : [],
    };
  }

  if (licenseNumber || licenseStatus) {
    snapshot.license = {
      number: licenseNumber || null,
      status: licenseStatus || null,
      source: "csv",
    };
  }

  if (businessStatus !== "unknown" || reviewSummary || outreachAngle) {
    snapshot.signals = { businessStatus };
    snapshot.ai = {
      reviewSummary: reviewSummary || null,
      outreachAngle: outreachAngle || null,
      topPainPoint: outreachAngle || null,
    };
  }

  return snapshot;
}
