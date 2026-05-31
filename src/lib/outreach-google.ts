import "server-only";

import type { OutreachEnrichmentSnapshot } from "@/lib/outreach-signals";

export type GooglePlaceSignalResult = {
  snapshot: Partial<OutreachEnrichmentSnapshot>;
  place?: {
    website?: string;
    formatted_phone_number?: string;
    formatted_address?: string;
    name?: string;
    rating?: number;
    user_ratings_total?: number;
    business_status?: string;
  };
  error?: string;
};

export async function fetchGooglePlaceSignals(
  placeId: string,
  apiKey?: string
): Promise<GooglePlaceSignalResult> {
  const key = apiKey || process.env.GOOGLE_MAPS_API_KEY;
  if (!key) {
    return { snapshot: {}, error: "Google Maps API key not configured." };
  }

  try {
    const response = await fetch(
      `https://maps.googleapis.com/maps/api/place/details/json?place_id=${placeId}&fields=name,formatted_phone_number,website,formatted_address,rating,user_ratings_total,business_status&key=${key}`
    );
    const data = await response.json();
    if (data.status !== "OK") {
      return { snapshot: {}, error: `Google API error: ${data.status}` };
    }

    const place = data.result as GooglePlaceSignalResult["place"];
    return {
      place,
      snapshot: {
        google: {
          rating: place?.rating ?? null,
          reviewCount: place?.user_ratings_total ?? null,
          businessStatus: place?.business_status ?? null,
          phone: place?.formatted_phone_number ?? null,
          address: place?.formatted_address ?? null,
        },
      },
    };
  } catch (error) {
    console.error("Google place signals failed:", error);
    return { snapshot: {}, error: "Failed to fetch Google place details." };
  }
}
