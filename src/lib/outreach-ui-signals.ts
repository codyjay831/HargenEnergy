import { parseEnrichmentSnapshot, type OutreachEnrichmentSnapshot } from "@/lib/outreach-signals";

export function getOutreachSignalBadges(enrichmentData: unknown) {
  const snapshot = parseEnrichmentSnapshot(enrichmentData);
  const badges: Array<{ label: string; variant: "closed" | "licensed" | "closed_temp" }> = [];

  if (snapshot?.signals?.businessStatus === "closed" || snapshot?.yelp?.isClosed) {
    badges.push({ label: "Closed", variant: "closed" });
  } else if (snapshot?.signals?.businessStatus === "temp_closed") {
    badges.push({ label: "Temp closed", variant: "closed_temp" });
  }

  const licenseStatus = snapshot?.license?.status?.toLowerCase() || "";
  if (licenseStatus.includes("active") || licenseStatus.includes("valid")) {
    badges.push({ label: "Licensed", variant: "licensed" });
  }

  return badges;
}

export function getOutreachSignalsSummary(enrichmentData: unknown) {
  const snapshot = parseEnrichmentSnapshot(enrichmentData);
  if (!snapshot) {
    return null;
  }

  return {
    googleRating: snapshot.google?.rating ?? null,
    googleReviewCount: snapshot.google?.reviewCount ?? null,
    googleBusinessStatus: snapshot.google?.businessStatus ?? null,
    yelpRating: snapshot.yelp?.rating ?? null,
    yelpReviewCount: snapshot.yelp?.reviewCount ?? null,
    businessStatus: snapshot.signals?.businessStatus ?? "unknown",
    licenseNumber: snapshot.license?.number ?? null,
    licenseStatus: snapshot.license?.status ?? null,
    reviewSummary: snapshot.ai?.reviewSummary ?? null,
    outreachAngle:
      snapshot.ai?.outreachAngle ?? snapshot.ai?.topPainPoint ?? snapshot.topPainPoint ?? null,
    reviewThemes: snapshot.ai?.reviewThemes ?? [],
  };
}

export function formatBusinessStatusLabel(status?: string | null) {
  switch (status) {
    case "active":
      return "Active";
    case "closed":
      return "Permanently closed";
    case "temp_closed":
      return "Temporarily closed";
    default:
      return "Unknown";
  }
}

export function mergeDisplayEnrichment(
  enrichmentData: unknown
): OutreachEnrichmentSnapshot | null {
  return parseEnrichmentSnapshot(enrichmentData);
}
