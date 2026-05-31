import "server-only";

import type { OutreachEnrichmentSnapshot } from "@/lib/outreach-signals";

export type LicenseSignalResult = {
  snapshot: Partial<OutreachEnrichmentSnapshot>;
  message?: string;
  error?: string;
};

export async function fetchLicenseSignals(input: {
  name: string;
  state?: string | null;
}): Promise<LicenseSignalResult> {
  const apiKey = process.env.TRADES_API_KEY;
  if (!apiKey) {
    return { snapshot: {}, error: "TradesAPI key not configured." };
  }

  try {
    const response = await fetch(
      `https://api.tradesapi.com/v1/license/search?q=${encodeURIComponent(input.name)}&state=${input.state || ""}&api_key=${apiKey}`
    );
    const data = await response.json();

    if (!response.ok) {
      return {
        snapshot: {},
        error: `TradesAPI error: ${data.message || response.statusText}`,
      };
    }

    const license = data.licenses?.[0];
    if (!license) {
      return { snapshot: {}, message: "No license found." };
    }

    return {
      snapshot: {
        license: {
          number: license.number || null,
          status: license.status || null,
          type: license.type || license.license_type || null,
          state: input.state || license.state || null,
          source: "tradesapi",
        },
      },
      message: `License: ${license.number} (${license.status})`,
    };
  } catch (error) {
    console.error("License lookup failed:", error);
    return { snapshot: {}, error: "Failed to check license status." };
  }
}
